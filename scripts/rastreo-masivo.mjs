#!/usr/bin/env node
/**
 * Rastreo masivo de prospectos.
 *
 * 1. Extrae dominios de directorios de agencias (que tienen cientos)
 * 2. Escanea cada uno con el modo rapido del motor propio
 * 3. Verifica el email en la web de la propia agencia
 * 4. Escribe un CSV listo para el emisor
 *
 * No envía nada. Solo produce la lista.
 */

import { writeFile } from "node:fs/promises";

const SCAN = "https://sello-ia.com/api/scan?rapido=1";
const SALIDA = process.argv[2] ?? "docs/outreach/descubrimiento.csv";
const UA = "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)";

const DIRECTORIOS = [
  "https://agencias.marketing/espana",
  "https://agencias.marketing/agencias-seo",
  "https://agencias.marketing/agencias-sem",
  "https://agencias.marketing/agencias-social-media",
  "https://agencias.marketing/agencias-email-marketing",
  "https://agencias.marketing/agencias-diseno-web",
  "https://agencias.marketing/agencias-branding",
  "https://agencias.marketing/agencias-content-marketing",
  "https://agencias.marketing/agencias-crm",
  "https://agencias.marketing/agencias-ecommerce",
  "https://agencias.marketing/agencias-growth-marketing",
  "https://agencias.marketing/agencias-automatizacion",
  "https://www.sortlist.es/diseno-web/madrid-es",
  "https://www.sortlist.es/diseno-web/barcelona-es",
  "https://www.sortlist.es/diseno-web/valencia-es",
  "https://www.sortlist.es/diseno-web/sevilla-es",
  "https://www.sortlist.es/diseno-web/zaragoza-es",
  "https://www.sortlist.es/marketing-digital/espana-es",
  "https://www.begoromero.com/agencias-diseno-web-espana",
  "https://escuelaeuropeadeempresa.eu/mejores-agencias-de-marketing-digital-de-espana",
  "https://www.dinamiq.com/noticias-agencia-digital-10-mejores-agencias-SEO-local-2026.html",
  "https://sayonara.es/mejores-agencias-de-marketing-digital-en-espana",
  "https://algenio.com/blog/mejores-agencias-de-marketing-digital-en-espana",
];

const EXTRAS = `
todobravo.es crixa.es several.pro markethink.net saulsanchez.agency
portfolio.es bebow.es indigitalec.com comunicartelab.com gottabepublic.com
dinamiq.com wearemarketing.es josmarketing.es startgo.es lmental.es
weaddyou.es aceleradoradigital.com wanatop.com webpositer.com galadrim.es
ensalza.com icrono.com ekpmarket.com makemarte.com olimpio.com
marketingylider.com airot.es
digitalyweb.com estudio-millennium.com imagen7.esingular.es
`.trim().split(/\s+/).filter((d) => d.includes("."));

const MALOS =
  /(sentry|wixpress|godaddy|squarespace|cloudflare|example|facebook|google|instagram|twitter|youtube|linkedin|pinterest|tiktok|amazon|ebay|wordpress\.org|schema\.org|w3\.org|vercel\.app|github|jquery|bootstrap|fontawesome|doubleclick|googletag|hotjar|posthog|ashbyhq|cdn|assets|static|mail|shopify|stripe|paypal|hubspot|intercom|drift|onion|bitly|youtu\.be|gstatic|googleapis|cloudfront)/i;

const GENERICOS =
  /^(info|contacto|contact|hola|hello|admin|general|ventas|sales|marketing|prensa|ayuda|support|clientes|comercial|direccion|recepcion)/i;

const RUTAS = ["/", "/contacto", "/contact", "/contact-us", "/privacidad", "/aviso-legal", "/quienes-somos"];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function htmlDe(url, ms = 12000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "text/html" } });
    return r.ok ? await r.text() : "";
  } catch { return ""; } finally { clearTimeout(to); }
}

async function emailsDe(d) {
  const hallados = new Map();
  for (const r of RUTAS) {
    if (hallados.size >= 2) break;
    const html = await htmlDe(`https://${d}${r}`, 7000);
    if (!html) continue;
    for (const m of html.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)) {
      const e = m[1].toLowerCase();
      if (MALOS.test(e)) continue;
      const dom = e.split("@")[1];
      if ((dom === d || dom.endsWith("." + d)) && !hallados.has(e)) {
        hallados.set(e, { email: e, generico: GENERICOS.test(e.split("@")[0]) });
      }
    }
  }
  return [...hallados.values()].sort((a, b) => (a.generico === b.generico ? 0 : a.generico ? 1 : -1));
}

(async () => {
  console.log(`\n  Rastreo masivo · ${new Date().toISOString().slice(0, 19)}\n`);

  const sem = new Set(EXTRAS.filter((d) => !MALOS.test(d)));

  console.log("  [1/2] Extrayendo de directorios");
  for (const u of DIRECTORIOS) {
    const html = await htmlDe(u);
    let antes = sem.size;
    for (const m of html.matchAll(/https?:\/\/([a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)) {
      const d = m[1].toLowerCase().replace(/^www\./, "");
      if (MALOS.test(d)) continue;
      if (d.split(".").length > 4) continue;
      sem.add(d);
    }
    console.log(`    ${new URL(u).hostname.padEnd(30)} +${sem.size - antes}  (total ${sem.size})`);
    await dormir(250);
  }

  console.log(`\n  [2/2] Escaneando ${sem.size} dominios\n`);

  const filas = [];
  let i = 0;
  let conInc = 0;
  let conMail = 0;

  for (const d of sem) {
    i++;
    if (i % 10 === 0 || sem.size < 15) process.stdout.write(`\n  ${i}/${sem.size} — `);
    process.stdout.write(".");

    try {
      const r = await fetch(SCAN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://${d}`, sitio: "" }),
      });
      const j = await r.json();
      if (j.error || !j.resultado || j.resultado.estado === "fallido") continue;

      const res = j.resultado;
      const sinAviso = res.detecciones.filter(
        (x) => ["chatbot", "avatar", "voz"].includes(x.tipo) && !x.conAviso
      );
      if (!sinAviso.length) continue;

      conInc++;
      const clave = sinAviso.map((x) => x.proveedor).join(" + ");
      const em = await emailsDe(d);
      const e = em.find((x) => !x.generico) ?? em[0];
      if (e) {
        conMail++;
        filas.push(`${d.split(".")[0]};${d};;${e.email};${clave};/`);
      }
    } catch { /* dominio fallido */ }
    await dormir(120);
  }

  const csv = ["empresa;dominio;nombre;email;evidencia;ruta", ...filas].join("\n");
  await writeFile(SALIDA, csv + "\n", "utf8");

  console.log(`\n\n  RESULTADO`);
  console.log(`  dominios rastreados : ${sem.size}`);
  console.log(`  con IA sin aviso    : ${conInc}`);
  console.log(`  con email verificable: ${conMail}`);
  console.log(`  escrito en          : ${SALIDA}`);
  console.log(`  (no se ha enviado nada)\n`);
})();