#!/usr/bin/env node
/**
 * Envío de la campaña de captación de SelloIA.
 *
 * POR DEFECTO EN MODO SIMULACIÓN: no envía nada hasta que pasas --enviar.
 * Pensado para que puedas revisar exactamente qué saldría antes demandarlo.
 *
 * Uso:
 *   node scripts/enviar-campana.mjs prospects.csv              # simulación
 *   node scripts/enviar-campana.mjs prospects.csv --enviar     # envío real
 *   node scripts/enviar-campana.mjs prospects.csv --enviar --solo=hola@x.com
 *
 * Variables necesarias:
 *   RESEND_API_KEY
 *   RESEND_FROM   (por defecto: SelloIA <hola@sello-ia.com>)
 */

import { readFile } from "node:fs/promises";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const archivo = args.find((a) => !a.startsWith("--"));
const REAL = args.includes("--enviar");
const solo = args.find((a) => a.startsWith("--solo="))?.split("=")[1];
const limite = Number(args.find((a) => a.startsWith("--max="))?.split("=")[1] ?? 40);

/**
 * Ritmo de envío.
 *
 * Un intervalo fijo es la firma más obvia de un bot: los filtros anti-spam
 * miden la distribución de los tiempos entre mensajes y un patrón exacto
 * delata automatización al instante. Por eso el retraso se sortea dentro de
 * una ventana, con pausas largas ocasionales y una deriva acumulativa.
 */
const numArg = (n, def) => Number(args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? def);
const MIN_MS = numArg("min", 110) * 1000;
const MAX_MS = Math.max(MIN_MS, numArg("max-seg", 260) * 1000);

function esperaHumana(indice, quedan) {
  let ms = MIN_MS + Math.random() * (MAX_MS - MIN_MS);
  // Deriva acumulativa: el cansancio también es humano.
  ms *= 1 + indice * 0.04;
  // Una de cada cuatro, el "se levantó a por un café".
  if (Math.random() < 0.25) ms += 45_000 + Math.random() * 75_000;
  // No hacerlo justo antes de dormir.
  if (quedan === 1) ms = Math.min(ms, 20_000);
  return Math.round(ms);
}

const API = "https://api.resend.com/emails";
const FROM = process.env.RESEND_FROM ?? "SelloIA <hola@sello-ia.com>";
const KEY = process.env.RESEND_API_KEY;

if (!archivo) {
  console.error("Uso: node scripts/enviar-campana.mjs <prospects.csv> [--enviar] [--max=N] [--delay=ms]");
  process.exit(1);
}
if (!KEY) {
  console.error("Falta RESEND_API_KEY. Configúrala antes de continuar.");
  process.exit(1);
}

/**
 * CSV con separador `;`. La cabecera es opcional: se detecta en vez de asumirla.
 * (Asumirla descartaba en silencio el primer prospecto cuando no la había.)
 */
function parsearCSV(texto) {
  const lineas = texto
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\uFEFF/, "").trim())
    .filter((l) => l && !l.startsWith("#"));

  if (!lineas.length) return [];

  const cabeceras = lineas[0].split(";").map((v) => v.trim().replace(/^"|"$/g, "").toLowerCase());
  const tieneCabecera = cabeceras.includes("email");
  const datos = tieneCabecera ? lineas.slice(1) : lineas;

  return datos
    .map((linea) => {
      const c = linea.split(";").map((v) => (v ?? "").trim().replace(/^"|"$/g, ""));
      return {
        empresa: c[0] ?? "",
        dominio: c[1] ?? "",
        nombre: c[2] ?? "",
        email: c[3] ?? "",
        evidencia: c[4] ?? "",
        ruta: c[5] ?? "",
      };
    })
    .filter((p) => p.email.includes("@"));
}

function pieBaja(email) {
  const id = crypto.createHash("sha256").update(email).digest("hex").slice(0, 10);
  return `
  <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0 12px">
  <p style="font-size:11px;color:#a8a29e;line-height:1.6">
    Recibes este mensaje porque en ${escapeHtml(new Date().toISOString().slice(0, 10))}
    escaneamos públicamente ${escapeHtml(new Date().toISOString().slice(0, 10))}
    la web de una empresa y detectamos un incumplimiento objetivo del Artículo 50 del
    Reglamento (UE) 2024/1689. No es publicidad: es un aviso verificable.
    <br><br>
    Si no quieres recibir más mensajes, responde con BAJA y te elimino en 24 h.
    Identificador: ${id}
  </p>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function mensaje(p) {
  const nombre = p.nombre ? `Hola ${p.nombre}:` : "Hola:";
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:600px">
  <p style="font-size:14px;color:#292524;line-height:1.7">${nombre}</p>

  <p style="font-size:14px;color:#292524;line-height:1.7">
    Te escribo por algo concreto, no por venderte nada.
  </p>

  <p style="font-size:14px;color:#292524;line-height:1.7">
    He escaneado <strong>${escapeHtml(p.dominio)}</strong> y he encontrado
    <strong>${escapeHtml(p.evidencia)}</strong> sin el aviso que exige el
    <strong>Artículo 50 del Reglamento Europeo de IA</strong>${p.ruta ? ` en <code>${escapeHtml(p.ruta)}</code>` : ""}.
  </p>

  <p style="font-size:14px;color:#292524;line-height:1.7">
    Desde el <strong>2 de agosto de 2026</strong> esa obligación es exigible: quien
    interactúa con un sistema de IA tiene que saberlo en el momento en que empieza
    la interacción. Un aviso en el pie de la web no cumple.
    La sanción del Art. 99 llega hasta <strong>15 M€ o el 3 % de la facturación
    global</strong>.
  </p>

  <p style="font-size:14px;color:#292524;line-height:1.7">
    <strong>No es una amenaza, es una observación.</strong> Si ya lo tienes cubierto,
    genial: dímelo y no te molesto más.
  </p>

  <p style="font-size:14px;color:#292524;line-height:1.7;margin:20px 0">
    <a href="https://sello-ia.com/?u=${encodeURIComponent(p.dominio)}"
       style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;
              padding:12px 22px;border-radius:6px;font-weight:600;font-size:14px">
      Ver el escaneo gratuito
    </a>
  </p>

  <p style="font-size:12px;color:#78716c;line-height:1.6">
    linac · SelloIA · verificación técnica del Art. 50 · sello-ia.com
  </p>
  ${pieBaja(p.email)}
</div>`;
}

const asunto = (p) =>
  `${p.dominio} — Art. 50: ${p.evidencia} sin aviso`;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const csv = await readFile(archivo, "utf8");
  let lista = parsearCSV(csv);
  if (solo) lista = lista.filter((p) => p.email === solo);
  lista = lista.slice(0, limite);

  console.log(`\n  ${REAL ? "ENVÍO REAL" : "SIMULACIÓN (no se envía nada)"}`);
  console.log(`  Destinatarios: ${lista.length}`);
  console.log(`  Remitente    : ${FROM}`);
  console.log(`  Ritmo        : ${(MIN_MS / 1000).toFixed(0)}–${(MAX_MS / 1000).toFixed(0)} s aleatorios entre envíos`);
  console.log(`  Ventana estimada: ~${Math.round((lista.length * (MIN_MS + MAX_MS)) / 2 / 60000 + lista.length * 0.3)} min\n`);
  if (REAL) console.log(`  ⚠️  Esto envía emails de verdad. Ctrl+C para cancelar.\n`);

  const cola = [...lista];
  let enviados = 0;
  let fallidos = 0;
  let rebotes = 0;

  while (cola.length) {
    const p = cola.shift();
    const indice = enviados + fallidos;
    const quedan = cola.length;
    const body = {
      from: FROM,
      to: [p.email],
      subject: asunto(p),
      html: mensaje(p),
    };

    if (!REAL) {
      console.log(`  [sim] → ${p.email}  |  ${asunto(p)}`);
      enviados++;
      continue;
    }

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const txt = await res.text();
      if (res.ok) {
        const id = JSON.parse(txt).id;
        console.log(`  [ok]   ${p.email}  →  ${id}`);
        enviados++;
      } else {
        let msg = txt;
        try { msg = JSON.parse(txt).message ?? txt; } catch { /* texto plano */ }
        console.log(`  [error] ${p.email}  →  HTTP ${res.status}: ${msg}`);
        fallidos++;
        // Un 422/404 casi siempre es dirección inexistente. Si acumulamos
        // rebotes, paramos: burnt reputation en el dominio no se arregla.
        if (res.status === 422 || res.status === 404) rebotes++;
        if (rebotes >= 4) {
          console.log("\n  🛑 4 rebotes seguidos. Deteniendo para no dañar el dominio.");
          break;
        }
      }
    } catch (e) {
      console.log(`  [red]  ${p.email}  →  ${e.message}`);
      fallidos++;
    }

    if (cola.length) {
      const pausa = esperaHumana(indice, quedan);
      const proximo = p2(cola[0]);
      console.log(`         ⏳ ${(pausa / 1000).toFixed(0)} s antes de ${proximo}`);
      await esperar(pausa);
    }
  }

  console.log(`\n  Total: ${enviados} enviados · ${fallidos} fallidos · ${rebotes} rebotes\n`);
  if (REAL && fallidos > 0) process.exitCode = 1;
})();

/** Muestra el nombre del dominio del siguiente envío en la cola. */
function p2(pros) {
  return pros.dominio || pros.email;
}