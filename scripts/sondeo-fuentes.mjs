#!/usr/bin/env node
/**
 * Sondeo de fuentes: ¿de dónde salen Prospectos españoles de verdad?
 *
 * Contexto: el directorio `agencias.marketing` resultó ser GLOBAL. De 143
 * prospectos, 137 no eran españoles, y el filtro no los salva porque un filtro
 * sobre una lista mala solo produce una lista mala más pequeña.
 *
 * Hecho que ya sabemos: de 564 dominios escaneados, 258 tenían IA sin aviso
 * (~46%). El problema nunca fue encontrar sitios con IA, fue encontrar sitios
 * ESPAÑOLES. Así que lo que hay que medir aquí no es "cuántos sitios tienen IA"
 * sino "cuántos dominios españoles de verdad entrega cada fuente".
 *
 * Cada fuente se puntúa por lo único que importa: dominios .es/.eu o
 * verificados como españoles, por segundo empleado.
 */

const UA = { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)" };

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(m);

async function texto(url, ms = 15000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { ...UA, Accept: "text/html,application/xml,application/json" } });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(to);
  }
}

const RUIDO =
  /(sentry|wixpress|godaddy|squarespace|cloudflare|example|facebook|instagram|twitter|youtube|linkedin|pinterest|tiktok|amazon|wordpress|schema\.org|w3\.org|vercel|github|jquery|bootstrap|google|doubleclick|hotjar|posthog|cdn|assets|static|mail|shopify|stripe|paypal|hubspot|intercom|bitly|gstatic|googleapis|cloudfront|amazonaws|s3\.|beacons|mapbox)/i;

function dominiosDe(html) {
  const out = new Set();
  for (const m of html.matchAll(/https?:\/\/([a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g)) {
    const d = m[1].toLowerCase().replace(/^www\./, "");
    if (RUIDO.test(d)) continue;
    if (d.split(".").length > 4) continue;
    out.add(d);
  }
  return out;
}

/** ¿El dominio es español por TLD, o hay que mirarlo? */
function esClaro(d) {
  return /\.es$/.test(d) || /\.eu$/.test(d);
}

// ── Candidatas ──────────────────────────────────────────────────────────────

const FUENTES = [
  {
    nombre: "BORME (registro mercantil oficial)",
    url: "https://www.boe.es/diario_borme/txt.php?id=BORME-C-2026-10-18",
    peso: "oficial, solo empresas españolas",
  },
  {
    nombre: "BORME API JSON",
    url: "https://www.boe.es/datosabiertos/api/borme/sumario/20261018",
    peso: "api oficial",
  },
  {
    nombre: "eInforma — empresas por provincia",
    url: "https://www.einforma.com/informacion-empresas/madrid",
    peso: "base de datos española",
  },
  {
    nombre: "Axesor — empresas España",
    url: "https://www.axesor.es/Informes-Empresas/Todas-Empresas/Madrid.html",
    peso: "base de datos española",
  },
  {
    nombre: "Cámara de Comercio Madrid",
    url: "https://www.camara.es/madrid/asuntos/actividad-empresarial",
    peso: "asociación de empresas",
  },
  {
    nombre: "Directorio español de agencias (pág. por país)",
    url: "https://agencias.marketing/directorio/espana",
    peso: "ya sabemos que es global",
  },
  {
    nombre: "Google-free: rutas .es desde webempresa",
    url: "https://www.webempresa.com/directorio-empresas/",
    peso: "directorio español",
  },
  {
    nombre: "Expansión — esenciales España",
    url: "https://www.expansion.com/directorio-empresas.html",
    peso: "directorio de empresasspanol",
  },
];

(async () => {
  log("\n  SONDEO DE FUENTES · ¿cuál da dominios españoles de verdad?\n");

  const resultados = [];

  for (const f of FUENTES) {
    const t0 = Date.now();
    const html = await texto(f.url);
    const ms = Date.now() - t0;
    const d = dominiosDe(html);
    const claros = [...d].filter(esClaro);
    const hayEspanolEnElTexto = /Espa[nñ]a|Madrid|Barcelona|Valencia/i.test(html.slice(0, 40000));

    resultados.push({ f, bytes: html.length, total: d.size, claros: claros.length, ms });

    log(`  ${f.nombre}`);
    log(`      ${html.length ? `${(html.length / 1024).toFixed(0)} KB` : "SIN RESPUESTA"} · ${d.size} dominios · ${claros.length} con TLD español · ${ms} ms`);
    if (claros.length) log(`      ej: ${claros.slice(0, 4).join(", ")}`);
    log("");
    await dormir(300);
  }

  log("  ═══ RANKING ═══\n");
  resultados
    .filter((r) => r.total > 0)
    .sort((a, b) => b.claros - a.claros || b.total - a.total)
    .forEach((r, i) => {
      const t = r.total ? (r.claros / r.total) * 100 : 0;
      log(`  ${i + 1}. ${r.f.nombre.padEnd(38)} ${String(r.claros).padStart(4)} españoles · ${String(r.total).padStart(4)} total · ${t.toFixed(1)}% · ${r.ms} ms`);
    });
  log("");
})();