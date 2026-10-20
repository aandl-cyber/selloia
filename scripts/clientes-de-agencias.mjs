/**
 * Extrae los dominios de los CLIENTES finales de las agencias de IA.
 *
 * La idea: una agencia que instala chatbots publica sus casos de éxito o su
 * cartera en la propia web. Esas webs de clientes son el sitio donde el Art. 50
 * se incumple de verdad —el cliente tiene un chatbot y no avisa—, y son a la
 * vez el mejor prospecto del mundo porque el dinero ya fluye por ahí.
 *
 * A las 42 agencias ya se les escribió con el argumento de revendedor (el Kit
 * y el Pro para su cartera). A los clientes finales se les escribe con otro
 * argumento, el suyo: "tu web tiene esto y no avisa". Son campañas distintas,
 * sin solape, sin repetir el mensaje.
 *
 * No se inventan dominios: solo salen de enlaces salientes reales de las
 * páginas de la propia agencia.
 */

import { readFile, writeFile } from "node:fs/promises";

const UA = {
  "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-ES,es;q=0.9",
};

const RUIDO =
  /(google|facebook|instagram|twitter|linkedin|youtube|tiktok|whatsapp|wa\.me|stripe|paypal|gumroad|github|gitlab|figma|canva|hotjar|analytics|gtag|schema\.org|w3\.org|wp\.com|wordpress|godaddy|hostinger|ionos|siteground|webflow|x\.com|threads|pinterest|vimeo|calendly|typeform|notion|mijourney|midjourney|openai|anthropic|claude|gemini\.google|apple| microsoft|cloudflare|vercel|netlify|amazon|aws|azure|hubspot|mailchimp|brevo|sendinblue|resend|hotmart|stripe\.com)/i;

const RUTAS = [
  "/",
  "/casos-de-exito",
  "/casos-exito",
  "/clientes",
  "/portfolio",
  "/proyectos",
  "/trabajos",
  "/casos",
  "/work",
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function htmlDe(url, ms = 9000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: UA,
    });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(to);
  }
}

/** Saca dominios salientes de un HTML, ignorando los del propio ruido. */
function dominiosSalientes(html, propios) {
  const hallados = new Set();
  for (const m of html.matchAll(/href="(https?:\/\/[^"']+)/gi)) {
    let d;
    try {
      d = new URL(m[1]).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      continue;
    }
    if (RUIDO.test(d)) continue;
    if (propios.some((p) => d === p || d.endsWith("." + p))) continue;
    if (d.endsWith(".es") || /\.(es|com|eu|io|ai|net|org)$/.test(d)) hallados.add(d);
  }
  return [...hallados];
}

(async () => {
  const agencias = (await readFile("docs/outreach/agencias-limpias.csv", "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1)
    .map((l) => l.split(";")[1]?.trim().toLowerCase())
    .filter(Boolean);

  // Para no repetir: quién ya ha recibido correo propio de SelloIA.
  let yaEscritos = new Set();
  try {
    const e = JSON.parse(
      (await readFile(".datos/emisor-estado.json", "utf8")).replace(/^﻿/, "")
    );
    yaEscritos = new Set((e.enviados ?? []).map((x) => String(x).toLowerCase()));
  } catch {
    /* primer arranque */
  }

  console.log(`\n  Clientes de agencias · ${agencias.length} agencias\n`);

  const porAgencia = new Map();
  let total = 0;

  for (const [i, ag] of agencias.entries()) {
    const propios = [ag, ...ag.split(".").slice(0, -1).map((s) => s + ".es")];
    const vistos = new Set();

    for (const ruta of RUTAS) {
      if (vistos.size >= 25) break;
      const html = await htmlDe(`https://${ag}${ruta}`);
      if (!html) continue;
      for (const d of dominiosSalientes(html, propios)) {
        if (!vistos.has(d) && !yaEscritos.has(d)) vistos.add(d);
      }
      await dormir(90);
    }

    if (vistos.size) {
      porAgencia.set(ag, [...vistos]);
      total += vistos.size;
      console.log(
        `  ${String(i + 1).padStart(2)}/${agencias.length} · ${ag.padEnd(30)} ${vistos.size} clientes`
      );
    }
    await dormir(120);
  }

  const unicos = [...new Set([...porAgencia.values()].flat())];
  await writeFile(
    "docs/outreach/clientes-de-agencias.txt",
    unicos.sort().join("\n") + "\n",
    "utf8"
  );

  console.log(`\n  RESULTADO: ${unicos.length} dominios de clientes (${total} menciones)`);
  console.log(`  escrito en docs/outreach/clientes-de-agencias.txt\n`);
})();
