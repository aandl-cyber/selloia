#!/usr/bin/env node
/**
 * Emisor autónomo.
 *
 * Corre como proceso DESACOPLADO: sobrevive al cierre de la sesión y sigue
 * durante los días que se le indiquen. Nadie tiene que vigilarlo.
 *
 * Responsible de:
 *  - leer la cola de prospectos con email verificado
 *  - enviar con ritmo humano (jitter, pausas largas, deriva)
 *  - respetar el tope diario de Resend
 *  - cortar si acumula rebotes (la reputación no se recupera)
 *  - guardar el estado para poder reanudar tras un reinicio
 *
 * Uso:
 *   node scripts/emisor-autonomo.mjs --cola=docs/outreach/prospectos.csv --horas=72 --por-hora=13
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const val = (n, def) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? def;

const COLA = val("cola", "docs/outreach/prospectos.csv");
const ESTADO = val("estado", ".datos/emisor-estado.json");
const HORAS = Number(val("horas", "72"));
const POR_HORA = Math.max(1, Number(val("por-hora", "13")));
const TOPE_DIARIO = Number(val("tope-diario", "95")); // margen bajo el límite de Resend
const MAX_REBOTES = 4;

const API = "https://api.resend.com/emails";
const FROM = process.env.RESEND_FROM ?? "SelloIA <hola@sello-ia.com>";
const KEY = process.env.RESEND_API_KEY;

if (!KEY) {
  console.error("Falta RESEND_API_KEY.");
  process.exit(1);
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

function parsearCSV(t) {
  const lineas = t
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (!lineas.length) return [];
  const cab = lineas[0].split(";").map((v) => v.trim().toLowerCase());
  const conCab = cab.includes("email");
  const datos = conCab ? lineas.slice(1) : lineas;
  return datos
    .map((l) => {
      const c = l.split(";").map((v) => (v ?? "").trim().replace(/^"|"$/g, ""));
      return { empresa: c[0] ?? "", dominio: c[1] ?? "", email: c[3] ?? "", evidencia: c[4] ?? "" };
    })
    .filter((p) => p.email.includes("@"));
}

function escapar(s) {
  const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s).replace(/[&<>"']/g, (c) => m[c]);
}

function cuerpo(p) {
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:600px">
  <p style="font-size:14px;color:#292524;line-height:1.7">Hola:</p>
  <p style="font-size:14px;color:#292524;line-height:1.7">
    Te escribo por algo concreto, no por venderte nada.
  </p>
  <p style="font-size:14px;color:#292524;line-height:1.7">
    He escaneado <strong>${escapar(p.dominio)}</strong> y he encontrado
    <strong>${escapar(p.evidencia)}</strong> sin el aviso que exige el
    <strong>Artículo 50 del Reglamento Europeo de IA</strong>.
  </p>
  <p style="font-size:14px;color:#292524;line-height:1.7">
    Desde el <strong>2 de agosto de 2026</strong> esa obligación es exigible. El Art. 99
    prevé hasta <strong>15 M€ o el 3 % de la facturación global</strong>.
  </p>
  <p style="font-size:14px;color:#292524;line-height:1.7">
    <strong>No es una amenaza, es una observación.</strong> Si ya lo tienes cubierto,
    dímelo y no te molesto más.
  </p>
  <p style="font-size:14px;color:#292524;margin:20px 0">
    <a href="https://sello-ia.com/?u=${encodeURIComponent(p.dominio)}"
       style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;
              padding:12px 22px;border-radius:6px;font-weight:600;font-size:14px">
      Ver el escaneo gratuito
    </a>
  </p>
  <p style="font-size:12px;color:#78716c;line-height:1.6">
    linac · SelloIA · <a href="https://sello-ia.com" style="color:#78716c">sello-ia.com</a>
  </p>
  <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0 12px">
  <p style="font-size:11px;color:#a8a29e;line-height:1.6">
    Es un aviso verificable sobre un incumplimiento objetivo del Art. 50 del Reglamento
    (UE) 2024/1689, no publicidad. Responde BAJA y te elimino en 24 h.
  </p>
</div>`;
}

function pausa(i, quedan) {
  const base = 3600_000 / POR_HORA;
  let ms = base * (0.75 + Math.random() * 0.5);
  ms *= 1 + Math.floor(i / POR_HORA) * 0.03;
  if (Math.random() < 0.08) ms += 8 * 60_000;
  if (quedan === 1) ms = Math.min(ms, 45_000);
  return Math.round(ms);
}

async function cargarEstado() {
  if (!existsSync(ESTADO)) {
    return { enviados: [], dia: hoy(), rebotes: 0, total: 0 };
  }
  try {
    return JSON.parse(await readFile(ESTADO, "utf8"));
  } catch {
    return { enviados: [], dia: hoy(), rebotes: 0, total: 0 };
  }
}
function hoy() {
  return new Date().toISOString().slice(0, 10);
}
async function guardar(e) {
  await writeFile(ESTADO, JSON.stringify(e, null, 2), "utf8");
}

(async () => {
  const cola = parsearCSV(await readFile(COLA, "utf8"));
  const est = await cargarEstado();

  log(`cola: ${cola.length} prospectos · ventana ${HORAS} h · ${POR_HORA}/hora · tope ${TOPE_DIARIO}/día`);

  /*
   * Freno de seguridad contra duplicados.
   *
   * Un mismo dominio recibido dos veces es el peor error posible en un envío en
   * frío: no es ruido, es daño de reputación. El estado se carga ANTES de
   * calcular los pendientes y la comprobación se hace por email normalizado.
   */
  const normalizar = (e) => e.trim().toLowerCase();
  const ya = new Set(est.enviados.map(normalizar));
  const vistosAqui = new Set();
  const duplicados = [];

  const pendientes = [];
  for (const p of cola) {
    const mail = normalizar(p.email);
    if (ya.has(mail)) {
      duplicados.push(p.email);
      continue;
    }
    if (vistosAqui.has(mail)) {
      duplicados.push(p.email);
      continue;
    }
    vistosAqui.add(mail);
    pendientes.push(p);
  }

  if (duplicados.length) {
    log(`descartados ${duplicados.length} ya contactados: ${duplicados.join(", ")}`);
  }
  log(`${pendientes.length} sin enviar todavía`);
  if (!pendientes.length) {
    log("no queda nadie. Terminando.");
    return;
  }

  const limite = Math.min(HORAS * POR_HORA, pendientes.length);
  const fin = Date.now() + HORAS * 3600_000;
  let i = 0;
  let hoyEnviados = est.dia === hoy() ? est.enviados.length : 0;

  log("arrancando");

  while (i < limite && Date.now() < fin) {
    // Rollover de día
    if (est.dia !== hoy()) {
      est.dia = hoy();
      hoyEnviados = 0;
      est.rebotes = 0;
      log("nuevo día: contador a cero");
    }
    if (hoyEnviados >= TOPE_DIARIO) {
      const espera = hastaMedianoche();
      log(`tope diario alcanzado (${hoyEnviados}). Duermo hasta mañana.`);
      await dormir(espera);
      continue;
    }

    const p = pendientes[i];
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [p.email],
          subject: `${p.dominio} — Art. 50: ${p.evidencia} sin aviso`,
          html: cuerpo(p),
        }),
      });

      if (res.ok) {
        // Se registra antes de seguir, y con la misma clave normalizada que se
        // usa para el filtro de duplicados.
        est.enviados.push(normalizar(p.email));
        hoyEnviados++;
        est.total++;
        i++;
        log(`[ok]   ${p.dominio.padEnd(28)} → ${p.email}  (${hoyEnviados}/${TOPE_DIARIO})`);
      } else {
        const t = await res.text();
        let msg = t;
        try { msg = JSON.parse(t).message ?? t; } catch {}
        est.rebotes++;
        log(`[err]  ${p.email} → ${msg.slice(0, 70)}`);
        if (est.rebotes >= MAX_REBOTES) {
          log(`🛑 ${MAX_REBOTES} rebotes. Paro: la reputación de sello-ia.com no se recupera.`);
          await guardar(est);
          return;
        }
        i++; // no insistir con una dirección que falla
      }
    } catch (e) {
      est.rebotes++;
      log(`[red]  ${p.email} → ${e.message}`);
      if (est.rebotes >= MAX_REBOTES) {
        await guardar(est);
        return;
      }
    }

    await guardar(est);

    if (i < limite && Date.now() < fin) {
      const ms = pausa(i, limite - i);
      log(`      ⏳ ${Math.round(ms / 60000)} min`);
      await dormir(ms);
    }
  }

  await guardar(est);
  log(`terminado. ${est.total} enviados en total · ${est.enviados.length} direcciones usadas`);
})();

function hastaMedianoche() {
  const ahora = new Date();
  const manana = new Date(ahora);
  manana.setUTCHours(0, 10, 0, 0);
  if (manana <= ahora) manana.setUTCDate(manana.getUTCDate() + 1);
  return manana - ahora;
}