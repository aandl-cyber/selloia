/**
 * Escanea los dominios de clientes de las agencias y filtra los que tengan
 * IA visible SIN aviso, que son los únicos a los que merece la pena escribir.
 *
 * El filtro es conservador a propósito: si el escáner no ve IA, no se escribe.
 * Un email diciendo "tu web incumple" a un sitio que cumple no es un error de
 *marketing, es mentir a alguien sobre su negocio, y además quema el dominio
 * de envío para todos los demás.
 */

import { readFile, writeFile } from "node:fs/promises";

const API = "https://sello-ia.com/api/scan";
const CLAVE = process.env.SCAN_API_KEY ?? "sk-interno-selloia-prospeccion-2026";
const ENTRADA = process.argv[2] ?? "docs/outreach/clientes-de-agencias.txt";
const SALIDA = process.argv[3] ?? "docs/outreach/clientes-con-ia.csv";

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Emails publicados por la propia web del prospecto. Nunca se inventan. */
const RUIDO =
  /(sentry|wixpress|godaddy|squarespace|example|facebook|instagram|twitter|youtube|linkedin|pinterest|tiktok|amazon|wordpress|schema\.org|w3\.org|vercel\.app|github|jquery|bootstrap|google\.|doubleclick|hotjar|posthog|cdn\.|assets|shopify|stripe|paypal|hubspot|intercom|drift|bitly|gstatic|googleapis|cloudfront|amazonaws|s3\.|beacons|mapbox)/i;
const NO_ESCRIBIR =
  /^(rgpd|lopd|dpo|legal|privacidad|protecciondatos|avisolegal|abuse|postmaster|hostmaster|spam|unsubscribe|baja)/i;
const RUTAS_MAIL = ["/", "/contacto", "/contact", "/aviso-legal", "/privacidad"];

async function htmlDe(url, ms = 9000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0)" } });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(to);
  }
}

async function emailsDe(dominio) {
  const hallados = new Set();
  for (const r of RUTAS_MAIL) {
    if (hallados.size >= 2) break;
    const html = await htmlDe(`https://${dominio}${r}`);
    if (!html) continue;
    for (const m of html.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)) {
      let e = m[1].toLowerCase();
      try { e = decodeURIComponent(e); } catch { /* no era percent-encoding */ }
      e = e.replace(/u00([0-9a-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      e = e.replace(/^[^a-z0-9._%+-]+/, "");
      if (RUIDO.test(e) || NO_ESCRIBIR.test(e.split("@")[0])) continue;
      const dom = e.split("@")[1];
      if ((dom === dominio || dom.endsWith("." + dominio)) && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)) hallados.add(e);
    }
    await dormir(90);
  }
  return [...hallados];
}

/** Señales fuertes de España en la propia web. El idioma no cuenta. */
async function esEspanola(dominio) {
  const tld = dominio.split(".").pop();
  if (tld === "es") return { ok: true, senal: ".es" };
  let h = "";
  for (const p of ["/", "/aviso-legal", "/contacto"]) {
    h += await htmlDe(`https://${dominio}${p}`);
    if (/NIF|CIF|\b\d{8}[A-HJ-NP-TV-Z]\b|\+\d?34[\s.-]?\d{9}/i.test(h)) break;
    await dormir(90);
  }
  if (!h) return { ok: false, senal: "no responde" };
  if (/\b[A-HJ-NP-SUVW]\d{7}[0-9A-J]\b/.test(h)) return { ok: true, senal: "NIF/CIF" };
  if (/\+34[\s.-]?\d{9}/.test(h)) return { ok: true, senal: "tel. +34" };
  if (/\b(Madrid|Barcelona|Valencia|Sevilla|Zaragoza|Málaga|Bilbao|Alicante)\b/i.test(h))
    return { ok: true, senal: "dirección ES" };
  return { ok: false, senal: "sin señal de España" };
}

(async () => {
  const dominios = (await readFile(ENTRADA, "utf8"))
    .split(/\r?\n/)
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.includes(".") && !RUIDO.test(d));

  let yaEscritos = new Set();
  try {
    const e = JSON.parse((await readFile(".datos/emisor-estado.json", "utf8")).replace(/^﻿/, ""));
    yaEscritos = new Set((e.enviados ?? []).map((x) => String(x).toLowerCase()));
  } catch { /* primer arranque */ }

  console.log(`\n  Escaneo de clientes · ${dominios.length} dominios · ya escritos: ${yaEscritos.size}\n`);

  const filas = [];
  let conIA = 0;
  let conMail = 0;

  for (const [i, d] of dominios.entries()) {
    if (yaEscritos.has(d)) continue;
    if (i % 10 === 9) console.log(`  ${i + 1}/${dominios.length} · ${conIA} con IA · ${conMail} con email`);

    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-selloia-key": CLAVE },
        body: JSON.stringify({ url: `https://${d}` }),
      });
      if (!r.ok) { await dormir(300); continue; }
      const { resultado } = await r.json();

      if (!resultado || resultado.estado !== "ok") { await dormir(300); continue; }
      if (resultado.score >= 95 || !resultado.detecciones?.length) { await dormir(300); continue; }

      conIA++;
      const sistemas = resultado.detecciones.map((x) => x.proveedor).join(", ");
      const criticos = resultado.stats?.hallazgosCriticos ?? 0;

      const geo = await esEspanola(d);
      if (!geo.ok) { console.log(`    ${d} · IA (${sistemas}) · DESCARTADO: ${geo.senal}`); await dormir(300); continue; }

      const mails = await emailsDe(d);
      if (!mails.length) { console.log(`    ${d} · IA (${sistemas}) · sin email publicado`); await dormir(300); continue; }

      conMail++;
      const elegido = mails[0];
      filas.push(`${d.split(".")[0]};${d};;${elegido};cliente de agencia;score ${resultado.score} · críticos ${criticos} · ${sistemas} · ${geo.senal}`);
      console.log(`  ✓ ${d.padEnd(34)} ${elegido.padEnd(36)} score ${resultado.score} · crít. ${criticos} · ${sistemas}`);
    } catch {
      /* un dominio que falla no detiene el lote */
    }
    await dormir(300);
  }

  await writeFile(SALIDA, ["empresa;dominio;nombre;email;evidencia;ruta", ...filas].join("\n") + "\n", "utf8");

  console.log(`\n  RESULTADO: ${conMail} prospectos con IA sin aviso y email de ${dominios.length} dominios`);
  console.log(`  con IA detectada: ${conIA} · con email: ${conMail}`);
  console.log(`  escrito en ${SALIDA}\n`);
})();
