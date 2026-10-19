#!/usr/bin/env node
/**
 * Campaña para agencias de IA: el ángulo del Kit Agencias.
 *
 * No es la campaña de "tu web incumple". La mayoría de estas agencias sí tienen
 * el aviso puesto, asi que ese mensaje seria falso y ademas les motrarian el
 * producto equivocado.
 *
 * El argumento real es otro: una agencia que implanta IA a sus clientes hereda
 * el problema. Si un cliente recibe una queja o una sanción por no haber avisado
 * de su chatbot, la primera pregunta va a ser "me lo instalaste tú". El Kit son
 * 499 € por poder responder que sí, con un informe en tu marca.
 *
 * Reglas que se respetan sin excepción: solo direcciones publicadas por la propia
 * empresa, nunca casillas de privacidad ni legales, y ritmo humano.
 */

import { readFile } from "node:fs/promises";

const API = "https://api.resend.com/emails";
const CLAVE = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.RESEND_FROM ?? "SelloIA <hola@sello-ia.com>";
const CSV = process.argv[2] ?? "docs/outreach/agencias-limpias.csv";
const REAL = process.argv.includes("--enviar");

const MIN_MS = 210_000;
const MAX_MS = 420_000;

/** Pausas largas ocasionales: el patrón humano, no un intervalo fijo. */
function esperaHumana(indice) {
  let ms = MIN_MS + Math.random() * (MAX_MS - MIN_MS);
  if (indice > 0 && indice % 9 === 0) ms += 8 * 60_000 + Math.random() * 10 * 60_000;
  if (indice > 0 && indice % 23 === 0) ms += 20 * 60_000 + Math.random() * 15 * 60_000;
  return ms;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function pie(remitente) {
  return `
  <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0 12px">
  <p style="font-size:11px;color:#a8a29e;line-height:1.6">
    Es un mensaje único. Si no te interesa, no volveré a escribirte.<br>
    Identificador: ${Buffer.from(remitente).toString("base64url").slice(0, 10)}
  </p>`;
}

function asunto() {
  return `Cuando un cliente tuyo pregunte si su chatbot tenía que avisar`;
}

function cuerpo(dominio, remitente) {
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:600px;color:#292524">
  <p style="font-size:14px;line-height:1.7">Hola:</p>

  <p style="font-size:14px;line-height:1.7">
    Te escribo por algo concreto y no por venderte nada.
  </p>

  <p style="font-size:14px;line-height:1.7">
    Desde el <strong>2 de agosto de 2026</strong> está exigible el Artículo 50 del
    Reglamento Europeo de IA: si la web de un cliente interactúa con una persona
    mediante un sistema de IA, esa persona tiene que saberlo al empezar la
    conversación.
  </p>

  <p style="font-size:14px;line-height:1.7">
    Tú implantas esos chatbots. Y aquí está el problema del que nadie habla en las
    reuniones de presupuesto: <strong>la responsabilidad no se queda en el cliente</strong>.
    Si el tuyo recibe una queja, y la sanción llega hasta 15 M€ o el 3 % de su
    facturación, la primera pregunta que le van a hacer es si lo instalaste tú.
  </p>

  <p style="font-size:14px;line-height:1.7">
   (<a href="https://sello-ia.com/blog/aepd-advertencias-ia-2026" style="color:#2f5fd6">La AEPD ya está
    dirigiendo advertencias en este terreno</a>: la del 23 de septiembre fue a una empresa por un sistema
    de IA en selección de personal, y no hubo sanción de por medio.)
  </p>

  <p style="font-size:14px;line-height:1.7">
    Por eso hemos montado el <strong>Kit Agencias, 499 €</strong>: un escáner real que
    detecta qué sistemas de IA tiene una web y si avisan de ello, y te lo entrega
    en tu marca, con informe vendible y textos legales reutilizables.
  </p>

  <p style="font-size:14px;line-height:1.7;margin:20px 0">
    <a href="https://sello-ia.com/precios"
       style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;
              padding:12px 22px;border-radius:6px;font-weight:600;font-size:14px">
      Ver el Kit Agencias
    </a>
  </p>

  <p style="font-size:14px;line-height:1.7">
    No tienes que creerte nada de lo que digo: <strong>el escáner funciona y es
    gratuito</strong>. Mete la web de cualquiera de tus clientes y lo compruebas
    en 60 segundos, sin registrarte.
  </p>

  <p style="font-size:14px;line-height:1.7">
    <a href="https://sello-ia.com/#escanner">Comprobar una web ahora</a>
  </p>

  <p style="font-size:14px;line-height:1.7">
    Si no te encaja, dímelo y no te molesto más.
  </p>
  ${pie(remitente)}
</div>`;
}

function parsear(csv) {
  const lineas = csv.split(/\r?\n/).filter(Boolean);
  if (!lineas.length) return [];
  return lineas
    .slice(1)
    .map((l) => l.split(";"))
    .filter((f) => f.length >= 4 && f[3]?.includes("@"))
    .map((f) => ({ empresa: f[0], dominio: f[1], email: f[3].trim().toLowerCase() }));
}

(async () => {
  if (!CLAVE && REAL) {
    console.error("  Falta RESEND_API_KEY.");
    process.exit(1);
  }

  const lista = parsear(await readFile(CSV, "utf8"));

  // Nunca repetir un envío anterior.
  let yaEnviados = new Set();
  try {
    const e = JSON.parse(await readFile(".datos/emisor-estado.json", "utf8"));
    yaEnviados = new Set((e.enviados ?? []).map((x) => String(x).toLowerCase()));
  } catch {
    /* primer arranque */
  }

  const pendientes = lista.filter((p) => !yaEnviados.has(p.email));

  console.log(`\n  CAMPAÑA KIT AGENCIAS`);
  console.log(`  ${REAL ? "ENVÍO REAL" : "SIMULACIÓN"}`);
  console.log(`  En lista: ${lista.length} · ya enviados: ${lista.length - pendientes.length} · pendientes: ${pendientes.length}\n`);
  if (REAL) console.log("  ⚠️  Envío de verdad. Ctrl+C para parar.\n");

  const cola = [...pendientes];
  let i = 0;
  let rebotes = 0;

  while (cola.length) {
    const p = cola.shift();
    const numero = i++;

    if (!REAL) {
      console.log(`  [sim] ${p.email.padEnd(42)} ${p.dominio}`);
      continue;
    }

    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { Authorization: `Bearer ${CLAVE}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [p.email],
          subject: asunto(),
          html: cuerpo(p.dominio, p.email),
        }),
      });
      const txt = await r.text();

      if (r.ok) {
        console.log(`  [ok] ${p.email.padEnd(42)} ${p.dominio}`);
      } else {
        console.log(`  [error] ${p.email} → HTTP ${r.status}: ${txt.slice(0, 120)}`);
        // 422/404 casi siempre es dirección inexistente. Cuatro seguidos y se
        // para: quemar el dominio no se arregla.
        if (r.status === 422 || r.status === 404) {
          rebotes++;
          if (rebotes >= 4) {
            console.log("\n  🛑 4 rebotes seguidos. Paro para no dañar el dominio.");
            break;
          }
        }
      }
    } catch (e) {
      console.log(`  [red] ${p.email} → ${e.message}`);
    }

    if (cola.length) {
      const ms = esperaHumana(numero);
      const min = Math.round(ms / 60000);
      console.log(`       ⏳ ${min} min`);
      await dormir(ms);
    }
  }

  console.log(`\n  Terminado. ${numero} procesados.\n`);
})();
