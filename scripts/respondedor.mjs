#!/usr/bin/env node
/**
 * Contestador automático.
 *
 * Corre desacoplado, igual que el emisor. Lee el buzón, clasifica cada respuesta
 * y contesta SOLO lo que es seguro contestar sin que nadie intervenga.
 *
 * Lo que NUNCA contesta solo (y avisa a la persona):
 *  - bajas (BAJA / STOP / dar de baja)
 *  - facturación, NIF, IVA, factura
 *  - negociación de precio o descuentos
 *  - quejas, abogado, sanción, denuncia
 *  - señal de compra (presupuesto, contratar, interested)
 *
 * Dos detalles que no son opcionales:
 *
 * 1. Idempotencia. `listarPendientes()` devuelve todas las issues abiertas con
 *    la etiqueta `inbound`, así que sin marcar, este script volvería a contestar
 *    al mismo email cada ciclo. Se comprueban las etiquetas antes de actuar.
 *
 * 2. Retardo. Contestar en el segundo exacto en que llega el email delata a un
 *    robot, y el prospecto que acaba de recibir un cold email lo nota. Cada
 *    respuesta se retrasa un tiempo aleatorio antes de salir.
 */

import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const INBOX = "https://sello-ia.com/api/inbox";
const REPLY = "https://sello-ia.com/api/reply";

const INBOX_SECRET = process.env.INBOX_SECRET ?? "";
const GH_TOKEN = process.env.GITHUB_TOKEN ?? "";
const REPO = process.env.GITHUB_REPO ?? "aandl-cyber/selloia";
const ADMIN = process.env.ADMIN_EMAIL ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const RESEND_FROM = process.env.RESEND_FROM ?? "SelloIA <hola@sello-ia.com>";

const CADENCIA_MS = Number(process.env.CADENCIA_MS ?? "180000");
const RETARDO_MIN_MS = Number(process.env.RETRARDO_MIN_MS ?? "900000"); // 15 min
const RETARDO_MAX_MS = Number(process.env.RETRARDO_MAX_MS ?? "5400000"); // 90 min

const PENDIENTES = ".datos/autorespuesta-pendientes.json";

/** Etiquetas que marcan un issue como ya atendido. */
const ATENDIDAS = new Set([
  "contestado-auto",
  "escalar",
  "ignorado",
  "sin-remitente",
  "fallo-envio",
]);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

// ── Clasificación ───────────────────────────────────────────────────────────
// El orden importa: primero lo que escala, después lo que se contesta.

const ESCALAR = [
  { re: /\b(BAJA|unsubscribe|stop|no me escribas|darme de baja|baja por favor)\b/i, motivo: "solicitud de baja" },
  { re: /\b(factura|facturaci[oó]n|NIF|CIF|IVA|pedido|albar[aá]n|domiciliaci[oó]n)\b/i, motivo: "facturación" },
  { re: /\b(descuento|rebaja|oferta|offer|precio especial|mismo precio|m[aá]s barato|cu[aá]nto me hac[eé]s)\b/i, motivo: "negociación de precio" },
  { re: /\b(abogado|jur[ií]dico|sanci[oó]n|multa|denuncia|AEPD|AESIA|demanda|multa|sentencia)\b/i, motivo: "riesgo legal" },
  { re: /\b(queja|reclamaci[oó]n|estafa|abuso|malo|vergonzoso|p[eé]simo|estafa)\b/i, motivo: "queja" },
  { re: /\b(quiero contratar|me interesa|presupuesto|contratar|reservar|plazo|empezar a trabajar|proposal)\b/i, motivo: "señal de compra" },
];

const AUTOMATICAS = [
  { re: /\b(cu[aá]nto|cuanto|precio|coste|cuesta|tarifa|vale|tarifas)\b/i, tipo: "precio" },
  { re: /\b(qu[eé]\s+(es|hace)|c[oó]mo\s+funciona|para\s+qu[eé]\s+sirve|en\s+qu[eé]\s+ayuda|para\s+sirve|explica|expl[ií]came)\b/i, tipo: "que_hace" },
  { re: /\b(gracias|perfecto|genial|entendido|many thanks|ok)\b/i, tipo: "agradecimiento" },
  { re: /\b(probar|prueba|escaneo|scanner|demo|probarlo|gratis|gratuito)\b/i, tipo: "demo" },
  { re: /\b(qui[eé]n\s+eres|sobre\s+vosotros|qui[eé]n\s+sois|empresa|confianza|qu[ií]ero\s+informarci[oó]n)\b/i, tipo: "confianza" },
];

function clasificar(texto) {
  // Lo trivial se descarta antes de mirar patrones. Un "ok" o un "hola" con
  // dos palabras hace match con casi cualquier expresión, y responder a eso con
  // un bloque de texto es exactamente lo que delata a un bot.
  if (texto.trim().length < 15) return { accion: "ignorar", motivo: "sin contenido" };
  for (const r of ESCALAR) if (r.re.test(texto)) return { accion: "escalar", motivo: r.motivo };
  for (const a of AUTOMATICAS) if (a.re.test(texto)) return { accion: "auto", tipo: a.tipo };
  return { accion: "escalar", motivo: "no encaja en ningún patrón conocido" };
}

// ── Plantillas ──────────────────────────────────────────────────────────────

const PIE = `<p style="font-size:11px;color:#a8a29e;margin-top:20px;line-height:1.6">
  SelloIA · A &amp; L Marketing Ltd · sello-ia.com<br>
  Respondido automáticamente. Si prefieres hablar con una persona, contesta a este
  email y te contestamos en menos de 4 horas laborables.</p>`;

const html = (cuerpo) => `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#292524;line-height:1.65">
${cuerpo}
<hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0 12px">
${PIE}
</div>`;

const RESPUESTAS = {
  precio: html(`<p style="margin:0 0 12px">Hola:</p>
  <p style="margin:0 0 12px">Gracias por escribir. Estos son los precios, sin IVA:</p>
  <ul style="margin:0 0 12px;padding-left:20px">
    <li style="margin-bottom:6px"><strong>Escaneo</strong> — gratis, sin registro. Te dice si tu web incumple el Art. 50.</li>
    <li style="margin-bottom:6px"><strong>Pro</strong> — 19 &euro;/mes. Reescaneo cada 30 d&iacute;as, aviso si el aviso de IA desaparece, SelloIA verificable.</li>
    <li style="margin-bottom:6px"><strong>Auditor&iacute;a</strong> — 199 &euro; una vez. Informe firmado, instalamos los avisos, incluye 12 meses de Pro.</li>
    <li style="margin-bottom:6px"><strong>Kit Agencias</strong> — 499 &euro;. Marca blanca e informe vendible a tu cliente.</li>
  </ul>
  <p style="margin:0 0 12px">Si me dices qu&eacute; est&aacute;s mirando te digo cu&aacute;l encaja. Y si prefieres
  verlo antes de pagar nada, el escaneo es gratis y en 60 segundos:
  <a href="https://sello-ia.com" style="color:#2f5fd6">sello-ia.com</a>.</p>`),

  que_hace: html(`<p style="margin:0 0 12px">Hola:</p>
  <p style="margin:0 0 12px">Respondo corto a lo que preguntas.</p>
  <p style="margin:0 0 12px">SelloIA analiza el c&oacute;digo p&uacute;blico de una web, detecta qu&eacute; sistemas de
  inteligencia artificial tiene instalados y comprueba si llevan el aviso que exige el
  <strong>Art&iacute;culo 50 del Reglamento Europeo de IA</strong>, obligatorio desde el 2 de agosto de 2026.</p>
  <p style="margin:0 0 12px">No es un formulario de preguntas: es un esc&aacute;ner real. Si tienes un chatbot,
  un avatar o contenido generado con IA, lo detecta con evidencia y te dice en qu&eacute; p&aacute;gina est&aacute;.</p>
  <p style="margin:0">Pru&eacute;balo con tu propia web, gratis y sin registro:
  <a href="https://sello-ia.com" style="color:#2f5fd6">sello-ia.com</a></p>`),

  demo: html(`<p style="margin:0 0 12px">Hola:</p>
  <p style="margin:0 0 12px">Claro. Mete la direcci&oacute;n de tu web en
  <a href="https://sello-ia.com" style="color:#2f5fd6">sello-ia.com</a> y ver&aacute;s el informe
  completo en 60 segundos. No hace falta tarjeta ni registro.</p>
  <p style="margin:0">Si prefieres que lo miremos juntos, dime cu&aacute;ndo te va bien y te escribo con un enlace.</p>`),

  confianza: html(`<p style="margin:0 0 12px">Hola:</p>
  <p style="margin:0 0 12px">Somos A &amp; L Marketing Ltd, sociedad brit&aacute;nica con sede en Londres.
  Construimos SelloIA precisamente porque al escanear webs encontr&aacute;mos que casi nadie
  cumple el Art&iacute;culo 50, aunque use chatbots desde hace a&ntilde;os.</p>
  <p style="margin:0">Si quieres verificarlo: la p&aacute;gina de transparencia en IA y el aviso legal est&aacute;n
  en la propia web. Y el esc&aacute;ner no es una declaraci&oacute;n nuestra: lo puedes probar con cualquier web,
  incluida la nuestra.</p>`),

  agradecimiento: html(`<p style="margin:0 0 12px">Hola:</p>
  <p style="margin:0">Gracias. Si te surge cualquier duda con el escaneo o con los textos legales, responde a este mismo email.</p>`),
};

// ── GitHub ──────────────────────────────────────────────────────────────────

const cabecerasGh = () => ({
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "selloia-respondedor",
  "Content-Type": "application/json",
});

async function issue(numero) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/issues/${numero}`, { headers: cabecerasGh() });
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  return r.json();
}

/**
 * Marca el issue como atendido y lo saca de la bandeja.
 *
 * `PUT` reemplaza el conjunto completo de etiquetas, así que se reaplican todas
 * menos `inbound`: es lo que hace que `listarPendientes()` deje de devolverlo
 * y, con ello, lo que garantiza que no se conteste dos veces.
 */
async function cerrar(numero, etiqueta) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/issues/${numero}/labels`, {
    method: "PUT",
    headers: cabecerasGh(),
    body: JSON.stringify({ labels: [etiqueta] }),
  });
  if (!r.ok) throw new Error(`GitHub labels ${r.status}`);
}

async function etiquetar(numero, etiqueta) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/issues/${numero}/labels`, {
    method: "POST",
    headers: cabecerasGh(),
    body: JSON.stringify({ labels: [etiqueta] }),
  });
  if (!r.ok) throw new Error(`GitHub labels ${r.status}`);
}

// ── Parsing ─────────────────────────────────────────────────────────────────

function parsear(body) {
  const de = body.match(/\*\*De:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const asunto = body.match(/\*\*Asunto:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
  const messageId = body.match(/\*\*Message-ID:\*\*\s*`([^`]+)`/)?.[1];
  const inReplyTo = body.match(/\*\*In-Reply-To:\*\*\s*`([^`]+)`/)?.[1];
  // El cuerpo va entre la primera y la segunda línea `---`.
  const partes = body.split(/^---$/m);
  const texto = (partes[1] ?? "").trim();
  const email = de.match(/<([^>]+@[^>]+)>/)?.[1] ?? de.match(/([^\s<]+@[^\s>]+)/)?.[1] ?? "";
  return { email, asunto, messageId, inReplyTo, texto };
}

// ── Acciones ────────────────────────────────────────────────────────────────

async function enviar(numero, m, cuerpo) {
  const r = await fetch(`${REPLY}?secret=${encodeURIComponent(INBOX_SECRET)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      para: m.email,
      asunto: m.asunto.startsWith("Re:") ? m.asunto : `Re: ${m.asunto}`,
      cuerpo,
      inReplyTo: m.inReplyTo ?? m.messageId,
      references: m.inReplyTo ?? m.messageId,
    }),
  });
  if (!r.ok) throw new Error(`reply HTTP ${r.status}`);
  await cerrar(numero, "contestado-auto");
}

async function avisarAdmin(numero, m, motivo) {
  if (!ADMIN || !RESEND_API_KEY) return;
  const cuerpo = `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;color:#292524;line-height:1.6">
    <p style="margin:0 0 12px"><strong>Respuesta que necesita tu criterio</strong></p>
    <p style="margin:0 0 6px;color:#78716c">Motivo: ${motivo}</p>
    <p style="margin:0 0 6px;color:#78716c">De: ${m.email}</p>
    <p style="margin:0 0 14px;color:#78716c">Asunto: ${m.asunto}</p>
    <div style="background:#f5f5f4;border-left:3px solid #b42318;padding:12px 14px;font-size:13px;white-space:pre-wrap">${m.texto
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .slice(0, 700)}</div>
    <p style="margin-top:16px;margin-bottom:0">
      <a href="https://github.com/${REPO}/issues/${numero}" style="display:inline-block;background:#1c1917;color:#fff;padding:11px 20px;border-radius:6px;font-weight:600;text-decoration:none">Abrir y responder</a>
    </p>
  </div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [ADMIN],
      subject: `[requiere tu criterio] ${m.asunto}`.slice(0, 120),
      html: cuerpo,
    }),
  });
  if (!r.ok) throw new Error(`aviso admin HTTP ${r.status}`);
  await cerrar(numero, "escalar");
}

// ── Cola de retardos ────────────────────────────────────────────────────────

async function cargarCola() {
  try {
    return JSON.parse(await readFile(PENDIENTES, "utf8"));
  } catch {
    return [];
  }
}

async function guardarCola(c) {
  await writeFile(PENDIENTES, JSON.stringify(c, null, 2), "utf8");
}

// ── Ciclo ───────────────────────────────────────────────────────────────────

async function ciclo() {
  const r = await fetch(`${INBOX}?secret=${encodeURIComponent(INBOX_SECRET)}`);
  if (!r.ok) throw new Error(`inbox HTTP ${r.status}`);
  const d = await r.json();
  const cola = await cargarCola();
  const enCola = new Set(cola.map((x) => x.numero));

  // ── 1. Lo que ya estaba en la cola y ya ha pasado su retardo ──
  const ahora = Date.now();
  const siguen = [];
  for (const item of cola) {
    if (ahora < item.listo) {
      siguen.push(item);
      continue;
    }
    try {
      await enviar(item.numero, item.mensaje, item.cuerpo);
      log(`[auto] ${item.tipo.padEnd(12)} → ${item.mensaje.email}`);
    } catch (e) {
      log(`[error] #${item.numero}: ${e.message}`);
      try { await etiquetar(item.numero, "fallo-envio"); } catch {}
    }
  }

  // ── 2. Lo nuevo que aparece en la bandeja ──
  for (const p of d.pendientes ?? []) {
    if (enCola.has(p.numero)) continue;
    try {
      const i = await issue(p.numero);
      const etiquetas = new Set((i.labels ?? []).map((l) => l.name ?? l));
      if ([...etiquetas].some((e) => ATENDIDAS.has(e))) continue;

      const m = parsear(i.body ?? "");
      if (!m.email) {
        await etiquetar(p.numero, "sin-remitente");
        continue;
      }
      // Nunca contestarse a sí mismo ni a buzones de prueba.
      if (m.email.includes("resend.app") || (m.messageId ?? "").includes("sello-ia.local")) {
        await etiquetar(p.numero, "ignorado");
        log(`[ignorado] #${p.numero} ${m.email} · mensaje de prueba propio`);
        continue;
      }

      const { accion, tipo, motivo } = clasificar(m.texto);

      if (accion === "ignorar") {
        await etiquetar(p.numero, "ignorado");
        log(`[ignorado] ${m.email} · ${motivo}`);
        continue;
      }

      if (accion === "escalar") {
        await avisarAdmin(p.numero, m, motivo);
        log(`[escalar] ${m.email} · ${motivo}`);
        continue;
      }

      // Retardo aleatorio para que no parezca un bot.
      const espera = RETARDO_MIN_MS + Math.random() * (RETRARDO_MAX_MS - RETARDO_MIN_MS);
      siguen.push({
        numero: p.numero,
        tipo,
        listo: ahora + espera,
        mensaje: m,
        cuerpo: RESPUESTAS[tipo] ?? RESPUESTAS.que_hace,
      });
      log(`[encolado] ${tipo.padEnd(12)} → ${m.email} · contesta en ${Math.round(espera / 60000)} min`);
    } catch (e) {
      log(`[error] #${p.numero}: ${e.message}`);
    }
  }

  await guardarCola(siguen);
  return siguen.length;
}

(async () => {
  if (!GH_TOKEN) {
    console.error("Falta GITHUB_TOKEN. No se arranca.");
    process.exit(1);
  }
  // `--una-vez` ejecuta un único ciclo y sale. Sirve para probar el contestador
  // sin dejar un proceso eternal corriendo por error.
  const unaVez = process.argv.includes("--una-vez");
  log(unaVez ? "contestador automático · un solo ciclo" : "contestador automático en marcha");
  let ultimoResumen = 0;

  while (true) {
    try {
      const n = await ciclo();
      if (n && Date.now() - ultimoResumen > 600_000) {
        ultimoResumen = Date.now();
        log(`en marcha · ${n} respuesta(s) esperando su retardo`);
      }
    } catch (e) {
      log(`fallo de ciclo: ${e.message}`);
    }
    if (unaVez) return;
    await dormir(CADENCIA_MS);
  }
})();