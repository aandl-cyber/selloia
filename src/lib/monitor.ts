import "server-only";

/**
 * Vigilancia de dominios.
 *
 * Un cron diario reanaliza los dominios registrados y avisa cuando el estado
 * cambia. Esto es lo que paga el plan Pro: no es un escaneo, es un vigilante.
 *
 * ALMACENAMIENTO
 * --------------
 * El estado vive en un fichero JSON dentro del propio repositorio, escrito con
 * la Contents API de GitHub. Es cero infraestructura y aguanta hasta que
 * haya cientos de dominios.
 *
 * En cuanto el volumen lo justifique hay que mover esto a una tabla real
 * (Postgres/Redis). Los dos módulos affected son `leerEstado` y `escribirEstado`:
 * son la única frontera que hay que tocar.
 */

const REPO = process.env.GITHUB_REPO ?? "aandl-cyber/selloia";
const RUTA = process.env.MONITOR_FILE ?? ".datos/vigilancia.json";
const RAMA = process.env.MONITOR_BRANCH ?? "main";

export interface RegistroDominio {
  dominio: string;
  email: string;
  alta: string;
  /** Resultado del último escaneo, para poder comparar. */
  anterior?: {
    score: number;
    criticos: number;
    sistemas: string[];
    fecha: string;
  };
  /** Marca de que ya avisamos, para no repetir el mismo email cada noche. */
  avisado?: boolean;
}

export interface EstadoVigilancia {
  dominios: RegistroDominio[];
}

const VACIO: EstadoVigilancia = { dominios: [] };

function token(): string {
  const t = process.env.GITHUB_TOKEN;
  if (!t) throw new Error("GITHUB_TOKEN no configurado");
  return t;
}

async function gh<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "selloia-monitor",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

interface ArchivoGithub {
  content?: string;
  encoding?: string;
  sha?: string;
}

export async function leerEstado(): Promise<{ estado: EstadoVigilancia; sha?: string }> {
  try {
    const f = await gh<ArchivoGithub>(
      `/repos/${REPO}/contents/${RUTA}?ref=${RAMA}`
    );
    if (!f.content) return { estado: VACIO };
    const texto = Buffer.from(f.content, "base64").toString("utf8");
    return { estado: JSON.parse(texto) as EstadoVigilancia, sha: f.sha };
  } catch {
    // Todavía no existe: es el primer arranque.
    return { estado: VACIO };
  }
}

export async function escribirEstado(estado: EstadoVigilancia, sha?: string): Promise<void> {
  const cuerpo = JSON.stringify(estado, null, 2);
  const base64 = Buffer.from(cuerpo, "utf8").toString("base64");

  await gh(`/repos/${REPO}/contents/${RUTA}`, {
    method: "PUT",
    body: JSON.stringify({
      message: "chore: actualizar vigilancia de dominios",
      content: base64,
      branch: RAMA,
      ...(sha ? { sha } : {}),
    }),
  });
}

/** Da de alta un dominio. Devuelve false si ya estaba. */
export async function registrarDominio(dominio: string, email: string): Promise<boolean> {
  const { estado, sha } = await leerEstado();
  const limpio = dominio.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (estado.dominios.some((d) => d.dominio === limpio)) return false;

  estado.dominios.push({
    dominio: limpio,
    email,
    alta: new Date().toISOString(),
  });
  await escribirEstado(estado, sha);
  return true;
}

export async function bajaDominio(dominio: string): Promise<boolean> {
  const { estado, sha } = await leerEstado();
  const antes = estado.dominios.length;
  estado.dominios = estado.dominios.filter(
    (d) => d.dominio !== dominio.toLowerCase().replace(/^https?:\/\//, "")
  );
  if (estado.dominios.length === antes) return false;
  await escribirEstado(estado, sha);
  return true;
}

export type Cambio =
  | { tipo: "nuevo"; dominio: string; score: number }
  | { tipo: "mejora"; dominio: string; de: number; a: number }
  | { tipo: "empeora"; dominio: string; de: number; a: number }
  | { tipo: "sin_cambios"; dominio: string; score: number }
  | { tipo: "ilegible"; dominio: string; motivo: string };

/**
 * Compara el escaneo de hoy con el anterior y decide si merece un email.
 *
 * Solo avisamos cuando hay un cambio real: empeorar el score, o disparar
 * una incidencia crítica. Avisar de lo mismo cada noche quema el buzón.
 */
export function evaluarCambio(
  registro: RegistroDominio,
  actual: { score: number; criticos: number; sistemas: string[] }
): Cambio {
  const d = registro.dominio;
  if (!registro.anterior) {
    return { tipo: "nuevo", dominio: d, score: actual.score };
  }

  const { score: de, criticos: criticosAntes } = registro.anterior;

  if (actual.criticos > criticosAntes) {
    return { tipo: "empeora", dominio: d, de, a: actual.score };
  }
  if (actual.criticos < criticosAntes || actual.score > de + 3) {
    return { tipo: "mejora", dominio: d, de, a: actual.score };
  }
  return { tipo: "sin_cambios", dominio: d, score: actual.score };
}

/** Plantilla del aviso. El texto dice qué pasó, no solo que pasó algo. */
export function emailAviso(cambio: Cambio): { asunto: string; html: string } {
  const base = "https://sello-ia.com";

  const envolver = (cuerpo: string) => `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#292524;line-height:1.65;max-width:560px">
${cuerpo}
<hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0 12px">
<p style="font-size:11px;color:#78716c;margin:0">
  SelloIA · vigilancia automática de tu dominio · <a href="${base}/privacidad" style="color:#78716c">privacidad</a> · para dejar de recibirlo, responde con BAJA
</p>
</div>`;

  switch (cambio.tipo) {
    case "empeora":
      return {
        asunto: `${cambio.dominio}: ha aparecido una incidencia crítica`,
        html: envolver(`<p style="margin:0 0 12px"><strong>${cambio.dominio} ha empeorado.</strong></p>
<p style="margin:0 0 12px">Tu puntuación ha pasado de ${cambio.de} a ${cambio.a} sobre 100 y ha aparecido al menos una incidencia crítica nueva.</p>
<p style="margin:0 0 12px">Lo más probable: se ha instalado un sistema de IA nuevo sin el aviso que exige el Art. 50.1, o ha desaparecido el que tenías.</p>
<p style="margin:0"><a href="${base}/#escanner" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">Ver el detalle</a></p>`),
      };
    case "mejora":
      return {
        asunto: `${cambio.dominio}: enhorabuena, has mejorado`,
        html: envolver(`<p style="margin:0 0 12px"><strong>${cambio.dominio} ha mejorado.</strong></p>
<p style="margin:0 0 12px">Tu puntuación ha pasado de ${cambio.de} a ${cambio.a} sobre 100 y han desaparecido incidencias críticas.</p>
<p style="margin:0">Comprueba el informe y comprueba que el aviso siga visible. Es el fallo más habitual: actualizar el tema y que un <code>display:none</code> lo tape en móvil.</p>`),
      };
    case "nuevo":
      return {
        asunto: `${cambio.dominio}: primer análisis hecho`,
        html: envolver(`<p style="margin:0 0 12px">Ya vigilamos <strong>${cambio.dominio}</strong>.</p>
<p style="margin:0 0 12px">Primera puntuación: <strong>${cambio.score}/100</strong>. A partir de ahora te escribimos solo cuando algo cambie de verdad, no cada noche.</p>
<p style="margin:0"><a href="${base}/#escanner" style="color:#2f5fd6">Ver el informe completo</a></p>`),
      };
    default:
      return { asunto: "", html: "" };
  }
}