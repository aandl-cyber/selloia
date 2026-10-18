#!/usr/bin/env node
/**
 * Extracción masiva desde el directorio de agencias.
 *
 * El sitemap de agentes.marketing declara 83.404 páginas de agencia, cada una
 * enlazando al sitio web real de esa agencia. SeConcurrent fetch de esas
 * páginas y se extrae el dominio externo.
 *
 * Es la única fuente con volumen suficiente para hacer Outreach de verdad.
 */

import { writeFile } from "node:fs/promises";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)" };
const CANTIDAD = Number(process.argv[2] ?? "4000");
const SALIDA = process.argv[3] ?? "docs/outreach/dominios-agencias.txt";

const PROPIO = "agencias.marketing";
const MALOS =
  /(sentry|wixpress|godaddy|squarespace|cloudflare|example|facebook|instagram|twitter|youtube|linkedin|pinterest|tiktok|amazon|wordpress|schema\.org|w3\.org|vercel\.app|github|jquery|bootstrap|google|doubleclick|hotjar|posthog|ashbyhq|cdn|assets|mail|shopify|stripe|paypal|hubspot|intercom|drift|bitly|gstatic|googleapis|cloudfront|beacons|mapbox|openstreetmap|hotjar|fullstory|clarity\.ms)/i;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function dominiosDe(agenciaUrl) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(agenciaUrl, { redirect: "follow", signal: ctrl.signal, headers: UA });
    if (!r.ok) return [];
    const html = await r.text();
    const salida = new Set();
    for (const m of html.matchAll(/https?:\/\/([a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})[^\s"'<>]*/g)) {
      let d = m[1].toLowerCase().replace(/^www\./, "");
      if (d === PROPIO || MALOS.test(d)) continue;
      if (d.split(".").length > 4) continue;
      salida.add(d);
    }
    return [...salida];
  } catch { return []; } finally { clearTimeout(to); }
}

(async () => {
  console.log(`\n  Extracción de directorios · objetivo ${CANTIDAD} agencias\n`);

  const idx = await (await fetch("https://agencias.marketing/sitemap.xml", { headers: UA })).text();
  const partes = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .filter((u) => u.includes("agencies"));

  const slugs = [];
  for (const p of partes) {
    const x = await (await fetch(p, { headers: UA })).text();
    for (const m of x.matchAll(/<loc>([^<]+)<\/loc>/g)) slugs.push(m[1]);
    console.log(`  ${p.replace("https://agencias.marketing", "")} -> ${slugs.length} accumulated`);
  }

  // Muestra repartida por toda la lista: las primeras suelen ser las mismas.
  const paso = Math.max(1, Math.floor(slugs.length / CANTIDAD));
  const muestra = slugs.filter((_, i) => i % paso === 0).slice(0, CANTIDAD);
  console.log(`\n  Visitando ${muestra.length} fichas (de ${slugs.length})\n`);

  const unicos = new Set();
  const CONC = 12;
  let hechas = 0;

  for (let i = 0; i < muestra.length; i += CONC) {
    const lote = muestra.slice(i, i + CONC);
    const r = await Promise.all(lote.map((u) => dominiosDe(u)));
    for (const ds of r) for (const d of ds) unicos.add(d);
    hechas += lote.length;
    process.stdout.write(`\r  ${hechas}/${muestra.length} · ${unicos.size} dominios únicos   `);
  }

  const lista = [...unicos].sort();
  await writeFile(SALIDA, lista.join("\n") + "\n", "utf8");

  console.log(`\n\n  ${lista.length} dominios -> ${SALIDA}`);
  console.log(`  siguiente paso: escanear con el modo rapido y verificar emails\n`);
})();