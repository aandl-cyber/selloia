import {
  FIRMAS,
  PATRONES_AVISO_IA,
  PATRONES_MARCADO_MAQUINA,
  RUTAS_TRANSPARENCIA,
  SEVERIDAD_PESO,
  SENALES_TEXTO_IA,
  type Firma,
} from "@/lib/scanner/signatures";
import { validarUrl, normalizarUrl, UrlInvalida } from "@/lib/scanner/url-guard";
import { generarLegalPack } from "@/lib/scanner/legal";
import type {
  DeteccionIA,
  Hallazgo,
  LegalPack,
  PaginaAnalizada,
  ResultadoScan,
} from "@/lib/types";

const TIMEOUT_MS = 15000;
const MAX_BYTES = 3_000_000;
const MAX_PAGINAS = 6;
const INTENTOS = 2;
const USER_AGENT =
  "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot) EscaneoTecnicoCumplimiento";

interface HtmlCrudo {
  url: string;
  status: number;
  ok: boolean;
  html: string;
  titulo: string;
  bytes: number;
  /** Motivo técnico del fallo, solo informativo. */
  motivo?: string;
}

/**
 * Descarga una página con límites de tiempo y tamaño, y reintenta.
 *
 * El reintento existe porque muchos CDNs answered el primer request con
 * lentitud. Un solo intento convertía un sitio lento en un "incumplimiento"
 * que no existía.
 */
async function traer(url: string): Promise<HtmlCrudo> {
  let ultimo: HtmlCrudo = { url, status: 0, ok: false, html: "", titulo: "", bytes: 0 };

  for (let intento = 1; intento <= INTENTOS; intento++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: ctrl.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.6",
        },
        cache: "no-store",
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("html") && !contentType.includes("text")) {
        ultimo = { url, status: res.status, ok: false, html: "", titulo: "", bytes: 0 };
        break;
      }

      const bruto = await res.text();
      const html = bruto.length > MAX_BYTES ? bruto.slice(0, MAX_BYTES) : bruto;
      const m = html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i);
      ultimo = {
        url: res.url || url,
        status: res.status,
        ok: res.ok,
        html,
        titulo: m ? m[1].trim() : "",
        bytes: html.length,
      };
      if (ultimo.ok && ultimo.bytes > 0) break;
    } catch (e) {
      const causa = (e as { cause?: { code?: string; message?: string } }).cause;
      ultimo = {
        url,
        status: 0,
        ok: false,
        html: "",
        titulo: "",
        bytes: 0,
        motivo:
          e instanceof Error && e.name === "AbortError"
            ? `sin respuesta en ${TIMEOUT_MS / 1000} s`
            : causa?.code ?? (e instanceof Error ? e.message : "error desconocido"),
      };
      if (process.env.SCAN_DEBUG) {
        console.error(`[traer] ${url} intento ${intento}/${INTENTOS}:`, ultimo.motivo);
      }
    } finally {
      clearTimeout(t);
    }
    if (intento < INTENTOS) await new Promise((r) => setTimeout(r, 1200));
  }

  return ultimo;
}

/** Texto visible del documento, sin scripts ni estilos. */
function textoVisible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fuentes de <script> declaradas en el documento. */
function scriptsDeclarados(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) out.add(m[1]);
  return [...out];
}

/**
 * Solo etiquetas, y sin las `<a`: el corpus con el que se buscan dominios con
 * punto.
 *
 * Un dominio en un enlace saliente no es un sistema instalado. aiagencies.eu
 * enlazaba a perplexity.ai y a claude.ai con sus botones de "Research on…" y
 * salía como si los tuviera integrados, con el hallazgo de Art. 50.2 detrás.
 * Tampoco lo es el dominio citado en un texto visible o en el payload de un
 * framework: es contenido editorial, la misma razón por la que ya se ignoran
 * las cadenas de JavaScript (el caso de sello-ia.com, que se detectaba a sí
 * mismo con ElevenLabs por tener un artículo que explica qué son).
 *
 * Lo que sí prueba integración son atributos de recurso: `src` de script o
 * iframe, `href` de `<link>`, `content` de meta, `data-*`. Eso se queda.
 */
function corpusDeAtributos(html: string): string {
  const etiquetas = html.match(/<[^>]+>/g)?.join("\n") ?? "";
  return etiquetas.replace(/<a\b[^>]*>/gi, "").toLowerCase();
}

/**
 * Código JavaScript embebido en la página.
 *
 * Excluye los `<script>` que no son JavaScript. Los bloques de datos
 * estructurados (`application/ld+json`) contienen texto plano, y en el caso de
 * sello-ia.com ese texto era el FAQ entero, con nombres de proveedores citados.
 * Contarlo como código hacía que la propia web apareciera con ElevenLabs y
 * Synthesia instalados porque el artículo que explica qué es ElevenLabs las
 * mencionaba.
 *
 * Eso no es lo mismo que usar un sistema de IA, que es lo que Art. 50 regula.
 */
function codigoJs(html: string): string {
  const partes: string[] = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const atributos = m[1] ?? "";
    const tipo = atributos.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1]?.toLowerCase();
    // Sin `type`, es JavaScript. Con `type`, solo si es un flavour de JS.
    if (tipo && !/^(module|text\/javascript|application\/javascript|text\/jsx)$/.test(tipo)) continue;
    // Los JSON-LD y application/json no son código.
    if (/json/.test(tipo ?? "")) continue;
    partes.push(m[2] ?? "");
  }
  return partes.join("\n");
}

/**
 * Un token con punto o barra es un dominio o una ruta: casi nunca aparece por
 * casualidad, así que se puede buscar en todo el documento.
 *
 * Un token suelto (`zE`, `dify`, `polly`) sí puede aparecer por casualidad, y
 * algunos son palabras del castellano o apellidos (`Polly`, `Claude`, `Copilot`,
 * `Firefly`). Esos solo cuentan si aparecen en JavaScript o en la URL de un
 * script, que es donde el proveedor deja su huella de verdad.
 */
function tokenEsDelicado(token: string): boolean {
  return !/[./]/.test(token);
}

/**
 * Quita el contenido de las cadenas literales.
 *
 * Next.js (y casi cualquier framework con render en cliente) incrusta el texto
 * de la página dentro de scripts inline: `self.__next_f.push(["...Intercom,
 * Tidio, Crisp..."])`. Ese texto es contenido editorial, no código. Buscando
 * identificadores sobre el script entero, una web que habla de los proveedores
 * de IA aparecía como si los tuviera instalados: el caso de sello-ia.com, que
 * se detectaba a sí misma con ElevenLabs y Synthesia por tener un artículo que
 * explica qué son.
 *
 * Un identificador real (`window.Intercom`) sobrevive; una palabra dentro de
 * comillas desaparece.
 */
function sinCadenas(js: string): string {
  return js
    .replace(/`(?:\\.|[^`\\])*`/g, " ") // plantillas
    .replace(/"(?:\\.|[^"\\])*"/g, " ")
    .replace(/'(?:\\.|[^'\\])*'/g, " "); // cadenas simples
}

/** Un token suelto debe aparecer como identificador, no como palabra suelta. */
function comoIdentificador(js: string, token: string): boolean {
  const t = token.toLowerCase();
  const codigo = sinCadenas(js);
  // `zE`, `zESettings`, `_hsq`, `window.driftConfig`, `Tawk_API`…
  return new RegExp(`(?:^|[^a-z0-9_$.])${escapeRegExp(t)}(?:[^a-z0-9_$]|$)`, "i").test(codigo);
}

/**
 * ¿Aparece el token en la URL de un script, como segmento y no por casualidad?
 *
 * Sin esto, `zE` casaba con `breeze-minification.js` y marcaba como Zendesk a
 * cualquier WordPress. Un token suelto tiene que ir delimitado también en la URL.
 */
function enUrlDeScript(urls: string[], token: string): boolean {
  const t = token.toLowerCase();
  if (!tokenEsDelicado(t)) return urls.some((u) => u.includes(t));
  const patron = new RegExp(`(?:^|[/._-])${escapeRegExp(t)}(?:[/._-]|$)`, "i");
  return urls.some((u) => patron.test(u));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Coincidencia de una firma contra el HTML de la página. */
function firmaCoincide(f: Firma, html: string, scripts: string[]): { firma: string; tipo: "script" | "selector" } | null {
  // Corpus de solo atributos (sin <a>): lo que no es un recurso cargado no
  // prueba que el sistema esté integrado. Ver corpusDeAtributos.
  const corpus = corpusDeAtributos(html);
  const js = codigoJs(html);
  const corpusScripts = scripts.map((s) => s.toLowerCase());

  for (const s of f.scripts ?? []) {
    const alvo = s.toLowerCase();
    // Las URLs de scripts declarados son una señal fuerte: es donde vive el widget.
    if (enUrlDeScript(corpusScripts, alvo)) return { firma: s, tipo: "script" };
    if (tokenEsDelicado(alvo)) {
      if (comoIdentificador(js, alvo)) return { firma: s, tipo: "script" };
    } else if (corpus.includes(alvo)) {
      return { firma: s, tipo: "script" };
    }
  }

  // `globals` son marcas que el proveedor deja en `window`. Antes no se
  // comprobaban en ningún sitio, así que varias firmas (Botpress, Voiceflow,
  // Chatfuel…) eran sencillamente indetectables. Es la misma prueba que
  // `scripts`: un identificador dentro de JavaScript.
  for (const g of f.globals ?? []) {
    const alvo = g.toLowerCase();
    if (enUrlDeScript(corpusScripts, alvo)) return { firma: g, tipo: "script" };
    if (comoIdentificador(js, alvo)) return { firma: g, tipo: "script" };
  }

  if (f.selectores) {
    for (const sel of f.selectores) {
      const limpio = sel.replace(/[[\]#.:*]/g, "").toLowerCase();
      if (limpio.length <= 3) continue;
      if (tokenEsDelicado(limpio)) {
        // Un id o clase solo cuenta si es un identificador real en el marcado
        // o aparece en un selector de JS.
        const enMarcado = new RegExp(`(?:id|class)\\s*=\\s*["'][^"']*\\b${escapeRegExp(limpio)}\\b`, "i").test(html);
        if (enMarcado || comoIdentificador(js, limpio)) return { firma: sel, tipo: "selector" };
      } else if (corpus.includes(limpio)) {
        return { firma: sel, tipo: "selector" };
      }
    }
  }
  return null;
}

/** ¿Hay ya un aviso de IA visible en la página? */
function tieneAvisoIA(texto: string, html: string): { ok: boolean; frase?: string } {
  for (const p of PATRONES_AVISO_IA) {
    const m = texto.match(p);
    if (m) return { ok: true, frase: m[0].trim() };
  }
  // El marcado legible por máquina NO sustituye al aviso visible.
  void html;
  return { ok: false };
}

/** Detecta si la web publica contenido probablemente generado con IA. */
function senalesContenidoIA(texto: string): number {
  let n = 0;
  for (const p of SENALES_TEXTO_IA) if (p.test(texto)) n++;
  return n;
}

function tieneMarcadoMaquina(html: string): { ok: boolean; evidencia?: string } {
  for (const p of PATRONES_MARCADO_MAQUINA) {
    const m = html.match(p);
    if (m) return { ok: true, evidencia: m[0].slice(0, 160) };
  }
  return { ok: false };
}

function slug(texto: string, max = 52): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

function evaluarScore(hallazgos: Hallazgo[]): number {
  const deduzco = hallazgos.reduce((a, h) => a + (SEVERIDAD_PESO[h.severity] ?? 0), 0);
  return Math.max(0, Math.min(100, 100 - deduzco));
}

function nivelDesde(score: number): ResultadoScan["nivel"] {
  if (score >= 85) return "bajo";
  if (score >= 60) return "medio";
  if (score >= 30) return "alto";
  return "critico";
}

function resumenDesde(h: Hallazgo[], nSistemas: number, url: string): string {
  const criticos = h.filter((x) => x.severity === "critico").length;
  const altos = h.filter((x) => x.severity === "alto").length;

  if (nSistemas === 0) {
    return `No hemos detectado sistemas de IA en ${url}. Si tu equipo usa IA internamente (ChatGPT, Copilot), recuerda que el Artículo 4 del Reglamento sigue siendo exigible y no se ve desde fuera.`;
  }
  if (criticos === 0 && altos === 0) {
    return `Hemos detectado ${nSistemas} sistema${nSistemas === 1 ? "" : "s"} de IA con avisos de transparencia presentes. Mantén el monitoring: los avisos se rompen con un simple cambio de tema.`;
  }
  const sistemas = nSistemas === 1 ? "1 sistema de IA" : `${nSistemas} sistemas de IA`;
  const base = `Hemos detectado ${sistemas} en ${url}. `;
  if (criticos > 0) {
    return `${base}${criticos} incumplimiento${criticos === 1 ? "" : "s"} crítico${criticos === 1 ? "" : "s"} que puede${criticos === 1 ? "" : "n"} dar lugar a sanción de hasta 15 M€ o el 3 % de tu facturación anual.`;
  }
  return `${base}${altos} incidencia${altos === 1 ? "" : "s"} de gravedad alta que conviene corregir ya.`;
}

/** N páginas internas susceptibles de contener IA. */
function paginasInternas(html: string, base: string): string[] {
  const hrefs = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#?]+)["']/gi)) {
    const href = m[1];
    if (href.startsWith("/") && !/\.(png|jpe?g|gif|svg|pdf|zip|css|js|ico|webp)$/i.test(href)) {
      hrefs.add(href.split("?")[0]);
    }
  }
  const formatos = /\/(blog|noticias|news|articulos|productos|servicios|recursos|guia|casos|sobre-nosotros)/i;
  const candidatos = [...hrefs].filter((h) => formatos.test(h)).slice(0, MAX_PAGINAS - 1);
  try {
    return candidatos.map((h) => new URL(h, base).toString());
  } catch {
    return [];
  }
}

/**
 * Escaneo completo de un dominio.
 * @throws {UrlInvalida} si la URL no es rastreable.
 */
export async function escanear(entrada: string, opciones?: { rapido?: boolean }): Promise<ResultadoScan> {
  const rapido = opciones?.rapido === true;
  const t0 = Date.now();
  const normalizada = normalizarUrl(entrada);
  const urlObj = validarUrl(normalizada);

  const paginaPrincipal = await traer(normalizada);
  const paginas: PaginaAnalizada[] = [];
  const detecciones: DeteccionIA[] = [];
  const hallazgos: Hallazgo[] = [];

  paginas.push({
    url: paginaPrincipal.url,
    status: paginaPrincipal.status,
    ok: paginaPrincipal.ok,
    titulo: paginaPrincipal.titulo,
    bytes: paginaPrincipal.bytes,
  });

  if (!paginaPrincipal.ok || paginaPrincipal.bytes === 0) {
    const tecnico = paginaPrincipal.motivo ? ` (${paginaPrincipal.motivo})` : "";
    const err =
      paginaPrincipal.status >= 500
        ? `El servidor de ${urlObj.hostname} respondió con un error ${paginaPrincipal.status}.`
        : paginaPrincipal.status === 0
          ? `No hemos podido leer ${urlObj.hostname}${tecnico}. Puede estar caído, bloquear nuestro agente o tardar demasiado en responder.`
          : `La página no ha devuelto contenido HTML legible.`;

    // Importante: no seguimos el mismo camino que un incumplimiento real.
    // Un escaneo que no pudo ejecutarse NO es una puntuación de riesgo.
    return {
      url: normalizada,
      urlNormalizada: normalizada,
      fecha: new Date().toISOString(),
      durationMs: Date.now() - t0,
      estado: "fallido",
      motivo: paginaPrincipal.motivo ?? `HTTP ${paginaPrincipal.status || "sin respuesta"}`,
      score: 0,
      nivel: "bajo",
      resumen: err,
      hallazgos: [],
      detecciones: [],
      paginas,
      stats: {
        paginasAnalizadas: 0,
        sistemasIA: 0,
        hallazgosCriticos: 0,
        hallazgosAltos: 0,
        cumplimientoArt50: false,
      },
    };
  }

  // ── Páginas internas ─────────────────────────────────────────────────────
  const internas = rapido ? [] : paginasInternas(paginaPrincipal.html, paginaPrincipal.url);
  const htmls: HtmlCrudo[] = [paginaPrincipal];
  for (const u of internas) {
    const r = await traer(u);
    paginas.push({ url: r.url, status: r.status, ok: r.ok, titulo: r.titulo, bytes: r.bytes });
    if (r.ok && r.bytes > 0) htmls.push(r);
  }

  // ── Detección de sistemas de IA ──────────────────────────────────────────
  const vistos = new Map<string, DeteccionIA>();

  for (const p of htmls) {
    const texto = textoVisible(p.html);
    const scripts = scriptsDeclarados(p.html);
    const aviso = tieneAvisoIA(texto, p.html);

    for (const f of FIRMAS) {
      const hit = firmaCoincide(f, p.html, scripts);
      if (!hit) continue;

      // No repetimos el mismo proveedor en la misma página.
      const clave = `${f.proveedor}::${p.url}`;
      if (vistos.has(clave)) continue;

      vistos.set(clave, {
        tipo: f.tipo,
        proveedor: f.proveedor,
        firma: hit.firma,
        pagina: p.url,
        conAviso: aviso.ok,
      });
    }
  }

  // Un mismo proveedor puede aparecer en varias páginas. Para el usuario es
  // un solo sistema: lo contabilizamos una vez, en la primera página vista.
  const porProveedor = new Map<string, DeteccionIA>();
  for (const d of vistos.values()) {
    if (!porProveedor.has(d.proveedor)) porProveedor.set(d.proveedor, d);
  }

  detecciones.push(...porProveedor.values());

  // ── Hallazgos: Art. 50(1) ────────────────────────────────────────────────
  const interactivos = detecciones.filter(
    (d) => d.tipo === "chatbot" || d.tipo === "avatar" || d.tipo === "voz"
  );
  const sinAviso = interactivos.filter((d) => !d.conAviso);

  if (interactivos.length > 0 && sinAviso.length === 0) {
    hallazgos.push({
      id: slug(`${sinAviso[0]?.proveedor ?? "IA"} aviso presente`),
      articulo: "art50.1",
      severity: "ok",
      titulo: "Aviso de IA presente en todos los sistemas interactivos",
      descripcion: `Se han detectado ${interactivos.length} sistema(s) interactivo(s) con IA y en todos ellos hay un aviso visible de que la persona no está hablando con un humano.`,
      solucion: "Nada que corregir aquí. Verifica mensualmente que el aviso siga visible.",
    });
  } else if (sinAviso.length > 0) {
    hallazgos.push({
      id: slug(`${sinAviso[0].proveedor} sin aviso`),
      articulo: "art50.1",
      severity: sinAviso.some((d) => d.tipo === "avatar" || d.tipo === "voz") ? "critico" : "critico",
      titulo: `${sinAviso.length} sistema(s) de IA sin aviso de transparencia`,
      descripcion: `Tu web usa ${sinAviso.map((d) => d.proveedor).join(", ")} para interactuar con tus visitantes, pero no hay ningún aviso visible de que la conversación no es humana. El Artículo 50.1 obliga a informar en el momento en que se inicia la interacción, no dentro de las cookies ni al final de la web.`,
      evidencia: `Detectado en ${sinAviso.map((d) => `${d.pagina} (firma: ${d.firma})`).join(" · ")}`,
      solucion:
        "Inserta un aviso visible en la primera pantalla del widget, antes de que la persona escriba. El texto legal lo tienes listo abajo, listo para pegar.",
      snippet: generarLegalPack(urlObj.hostname).avisoChatbot,
    });
  }

  // ── Hallazgos: Art. 50(2) marcado legible por máquina ─────────────────────
  const conGeneracion = detecciones.filter((d) => d.tipo === "generador_contenido");
  if (conGeneracion.length > 0) {
    const marcado = tieneMarcadoMaquina(htmls[0].html);
    if (!marcado.ok) {
      hallazgos.push({
        id: "marcado-maquina-ausente",
        articulo: "art50.2",
        severity: "alto",
        titulo: "Contenido generado por IA sin marcado legible por máquina",
        descripcion:
          "El Artículo 50.2 exige que las salidas de sistemas generativos lleven un marcado legible por máquina que permita detectar su origen sintético. El aviso visible no cubre esta obligación: son dos requisitos distintos.",
        solucion:
          "Añade las metaetiquetas de marcado en el <head> de las páginas con contenido generado. Te lo damos listo para copiar.",
        snippet: generarLegalPack(urlObj.hostname).snippetMarcado,
      });
    } else {
      hallazgos.push({
        id: "marcado-maquina-presente",
        articulo: "art50.2",
        severity: "ok",
        titulo: "Marcado legible por máquina presente",
        descripcion: `Se ha detectado marcado de origen sintético en el documento: ${marcado.evidencia}`,
        solucion: "Verifica que se mantenga tras cada actualización de la web.",
      });
    }
  }

  // ── Hallazgos: Art. 50(4) etiquetado de contenido publicado ──────────────
  const senalesEditorial = senalesContenidoIA(textoVisible(htmls[0].html));
  const hayEditorial = htmls.some((p) => /\/blog|\/noticias|\/news|\/articulos|\/recursos/i.test(p.url));
  if (hayEditorial && senalesEditorial >= 2) {
    const conEtiqueta = await hayPaginaTransparencia(urlObj);
    hallazgos.push({
      id: "contenido-sintetico-sin-etiquetar",
      articulo: "art50.4",
      severity: conEtiqueta ? "medio" : "alto",
      titulo: "Contenido editorial con señales de IA y sin etiquetado visible",
      descripcion: `Hemos detectado ${senalesEditorial} patrones típicos de redacción asistida por IA en tu contenido editorial. El Artículo 50.4 exige identificar de forma visible el contenido generado o manipulado artificialmente.`,
      evidencia: `Señales en: ${htmls.filter((p) => senalesContenidoIA(textoVisible(p.html)) > 0).map((p) => p.url).slice(0, 3).join(" · ")}`,
      solucion: conEtiqueta
        ? "Ya tienes página de transparencia. Añade el aviso de contenido IA junto a cada pieza afectada y enlaza a la página."
        : "Publica una página de transparencia y añade el aviso junto a cada contenido generado por IA. Ambos textos están listos abajo.",
      snippet: generarLegalPack(urlObj.hostname).avisoGenerativo,
    });
  }

  // ── Página de transparencia ──────────────────────────────────────────────
  const conTransparencia = rapido ? true : await hayPaginaTransparencia(urlObj);
  if (!conTransparencia && detecciones.length > 0) {
    hallazgos.push({
      id: "sin-pagina-transparencia",
      articulo: "art50.1",
      severity: "medio",
      titulo: "No existe página de transparencia en IA",
      descripcion:
        "No hemos encontrado una página que explique qué sistemas de IA utilizas, con qué fines y cómo se identifican sus salidas. No es siempre obligatorio, pero es la forma más sólida de demostrar el cumplimiento si alguien te lo pide.",
      solucion:
        "Publica la página de transparencia que teodendron abajo en /transparencia-ia y enlázala desde el pie y desde el aviso del chat.",
      snippet: generarLegalPack(urlObj.hostname).paginaTransparencia.slice(0, 400) + "\n\n<!-- …página completa en el informe de pago… -->",
    });
  }

  // ── Art. 4 · Alfabetización en IA ────────────────────────────────────────
  if (detecciones.length > 0) {
    hallazgos.push({
      id: "alfabetizacion-ia-personal",
      articulo: "art4",
      severity: "bajo",
      titulo: "Formación del personal en IA (Art. 4) no verificable desde fuera",
      descripcion:
        "Desde fuera no podemos comprobar si tu equipo ha recibido formación en IA. Es una obligación exigible desde el 2 de febrero de 2025 para todo el que usa IA en su trabajo, y su sanción se rige por el régimen nacional. Si no la tienes documentada, es el hueco más fácil de cerrar y el más barato.",
      solucion:
        "Implanta un registro de formación (fecha, contenido, asistentes, responsable) y una política interna de uso. Te damos el documento base.",
      snippet: generarLegalPack(urlObj.hostname).politicaInterna.slice(0, 400) + "\n\n<!-- …política completa en el informe de pago… -->",
    });
  }

  // ── Sin IA detectada ─────────────────────────────────────────────────────
  if (detecciones.length === 0) {
    hallazgos.push({
      id: "sin-ia-detectada",
      articulo: "art50.1",
      severity: "ok",
      titulo: "No se ha detectado IA visible en el sitio",
      descripcion:
        "No hemos encontrado chatbots, avatares, generadores de contenido ni widgets con IA. Si tu web cumple el Art. 50 desde fuera, lo más probable es que no lo necesites. Recuerda que el Art. 4 (formación del equipo) sigue aplicando aunque no haya IA visible.",
      solucion: "Vuelve a pasar el escaneo mensualmente. El coste es cero.",
    });
  }

  const score = evaluarScore(hallazgos);
  const criticos = hallazgos.filter((h) => h.severity === "critico").length;
  const altos = hallazgos.filter((h) => h.severity === "alto").length;

  return {
    url: normalizada,
    urlNormalizada: normalizada,
    fecha: new Date().toISOString(),
    durationMs: Date.now() - t0,
    estado: "ok",
    score,
    nivel: nivelDesde(score),
    resumen: resumenDesde(hallazgos, detecciones.length, urlObj.hostname),
    hallazgos: hallazgos.sort((a, b) => (SEVERIDAD_PESO[b.severity] ?? 0) - (SEVERIDAD_PESO[a.severity] ?? 0)),
    detecciones,
    paginas,
    stats: {
      paginasAnalizadas: paginas.filter((p) => p.ok).length,
      sistemasIA: detecciones.length,
      hallazgosCriticos: criticos,
      hallazgosAltos: altos,
      cumplimientoArt50: criticos === 0 && altos === 0,
    },
  };
}

/** Busca una página de transparencia o aviso legal en las rutas habituales. */
async function hayPaginaTransparencia(base: URL): Promise<boolean> {
  const candidatas = RUTAS_TRANSPARENCIA.map((r) => new URL(r, base).toString());
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);

  try {
    const res = await Promise.allSettled(
      candidatas.map(async (u) => {
        const r = await fetch(u, {
          method: "HEAD",
          redirect: "follow",
          signal: ctrl.signal,
          headers: { "User-Agent": USER_AGENT },
          cache: "no-store",
        });
        return { u, status: r.status };
      })
    );
    return res.some(
      (x) => x.status === "fulfilled" && x.value.status >= 200 && x.value.status < 300
    );
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** Pack legal completo (se adjunta al informe de pago). */
export function packLegal(url: string): LegalPack {
  return generarLegalPack(validarUrl(url).hostname);
}

export { UrlInvalida, validarUrl, normalizarUrl };