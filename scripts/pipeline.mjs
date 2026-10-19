#!/usr/bin/env node
/**
 * Pipeline de prospección continuo.
 *
 * Encadena, sin intervención y en este orden:
 *
 *   dominios.txt -> ¿es español? -> escaneo con el motor propio -> ¿IA sin aviso?
 *                -> ¿publica email? -> deduplicar -> cola de envío
 *
 * Diseñado para correr cinco días seguidos. Todo lo que no pasa el filtro se
 * registra con el motivo, porque el dato interesante no es solo el que entra sino
 * el que se cae y por qué.
 *
 * Nota sobre el filtro geográfico: un TLD `.mx` no se toca. Para los `.com` y
 * similares, que no dicen país, hace falta una señal FUERTE en la web (NIF/CIF,
 * +34, dirección postal). `lang="es"` no cuenta: solo significa "en español" y
 * lo cumple media Latinoamérica. Ya se cometió ese error una vez.
 */

import { readFile, writeFile, appendFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)" };
const SCAN = "https://sello-ia.com/api/scan?rapido=1";
const CLAVE = process.env.SCAN_API_KEY ?? "";

const ENTRADA = process.argv[2] ?? "docs/outreach/dominios.txt";
const COLA = "docs/outreach/cola.csv";
const LOG = "docs/outreach/pipeline.log";

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const ahora = () => new Date().toISOString().slice(11, 19);
const log = (m) => {
  const l = `[${ahora()}] ${m}`;
  console.log(l);
  appendFile(LOG, l + "\n", "utf8").catch(() => {});
};

// ── Geografía ────────────────────────────────────────────────────────────────

const TLD_UE = new Set([
  "es", "eu", "de", "fr", "it", "pt", "nl", "be", "at", "ie", "fi", "dk", "se",
  "pl", "gr", "cz", "ro", "hu", "sk", "si", "hr", "bg", "lt", "lv", "ee",
  "lu", "mt", "cy", "is", "no",
]);

const NIF_ES = /\b[A-HJ-NP-SUVW]\d{7}[0-9A-J]\b/;
const TEL_ES = /(\+34[\s.-]?\d{9})|(\b(?:9[1-9]|6[1-9]|7[1-9])\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b)/;
const POBLACIONES_ES =
  /(?:Madrid|Barcelona|Valencia|Sevilla|Zaragoza|M[aá]laga|Murcia|Palma|Bilbao|Alicante|C[aá]diz|Gij[oó]n|Valladolid|Granada|Elche|Oviedo|Donostia|Burgos|Albacete|Salamanca|Logroño|Lleida|Tarragona|Gerona|Cord[oó]ba|Vigo|Pontevedra|Ja[eé]n|Ourense|Guadalajara|Toledo)\b/;
const CP_ES = /\b\d{5}\b/;

async function htmlDe(url, ms = 9000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { ...UA, Accept: "text/html" } });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(to);
  }
}

/** ¿La empresa es española? Exige una señal fuerte, no el idioma. */
async function esDeEspana(d) {
  const tld = d.split(".").pop();
  if (tld.length === 2 && TLD_UE.has(tld)) return { ok: true, senal: `TLD .${tld}` };
  if (tld.length === 2) return { ok: false, senal: `TLD de otro país (.${tld})` };

  let h = "";
  for (const p of ["/", "/aviso-legal", "/contacto"]) {
    const x = await htmlDe(`https://${d}${p}`);
    h += x;
    if (NIF_ES.test(h) || (CP_ES.test(h) && POBLACIONES_ES.test(h))) break;
    await dormir(100);
  }
  if (!h) return { ok: false, senal: "no responde" };
  if (NIF_ES.test(h)) return { ok: true, senal: "NIF/CIF español" };
  if (TEL_ES.test(h)) return { ok: true, senal: "teléfono +34/provincial" };
  if (CP_ES.test(h) && POBLACIONES_ES.test(h)) return { ok: true, senal: "dirección postal española" };
  return { ok: false, senal: "sin señal fuerte de España" };
}

// ── Email ───────────────────────────────────────────────────────────────────

const RUIDO =
  /(sentry|wixpress|godaddy|squarespace|example|facebook|instagram|twitter|youtube|linkedin|pinterest|tiktok|amazon|wordpress|schema\.org|w3\.org|vercel|github|jquery|bootstrap|google|doubleclick|hotjar|cdn|shopify|stripe|paypal|hubspot|intercom|drift|bitly|gstatic|googleapis|cloudfront|beacons|mapbox)/i;
/** Nunca escribir a estas casillas: son las que no lda nadie. */
const NO_ESCRIBIR = /^(rgpd|lopd|dpo|legal|protecciondatos|abuse|postmaster|hostmaster|abuse|spam)@/i;

async function emailDe(d) {
  const hallados = new Map();
  for (const p of ["/", "/contacto", "/contact", "/aviso-legal", "/privacidad"]) {
    if (hallados.size >= 2) break;
    const h = await htmlDe(`https://${d}${p}`, 8000);
    if (!h) continue;
    for (const m of h.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)) {
      const e = m[1].toLowerCase();
      if (RUIDO.test(e) || NO_ESCRIBIR.test(e)) continue;
      const dom = e.split("@")[1];
      if ((dom === d || dom.endsWith("." + d)) && !hallados.has(e)) {
        hallados.set(e, { email: e, generico: /^(info|contacto|contact|hola|hello|admin|general|ventas|sales|marketing|prensa|ayuda|clientes|comercial)/.test(e.split("@")[0]) });
      }
    }
    await dormir(100);
  }
  const arr = [...hallados.values()].sort((a, b) => (a.generico === b.generico ? 0 : a.generico ? 1 : -1));
  return arr[0] ?? null;
}

// ── Pipeline ────────────────────────────────────────────────────────────────

async function cargarProcesados() {
  try {
    return new Set(JSON.parse(await readFile(".datos/procesados.json", "utf8")));
  } catch {
    return new Set();
  }
}
const guardarProcesados = (s) => writeFile(".datos/procesados.json", JSON.stringify([...s]), "utf8");

(async () => {
  if (!existsSync(ENTRADA)) {
    console.error(`  No existe ${ENTRADA}`);
    process.exit(1);
  }
  if (!CLAVE) {
    console.error("  Falta SCAN_API_KEY: sin ella el límite público (8/hora) corta el proceso.");
    process.exit(1);
  }
  await mkdir(".datos", { recursive: true });

  const dominios = [
    ...new Set(
      (await readFile(ENTRADA, "utf8"))
        .split(/\r?\n/)
        .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0])
        .filter((d) => d.includes(".") && !RUIDO.test(d))
    ),
  ];

  const procesados = await cargarProcesados();
  const pendientes = dominios.filter((d) => !procesados.has(d));

  log(`dominios ${dominios.length} · nuevos ${pendientes.length} · ya visto ${dominios.length - pendientes.length}`);

  const descartes = [];
  const cola = [];

  for (const [i, d] of pendientes.entries()) {
    procesados.add(d);
    if (i % 10 === 9) {
      await guardarProcesados(procesados);
      log(`  ${i + 1}/${pendientes.length} · cola ${cola.length} · descartados ${descartes.length}`);
    }

    const geo = await esDeEspana(d);
    if (!geo.ok) {
      descartes.push(`${d};geografia;${geo.senal}`);
      continue;
    }

    let scan;
    try {
      const r = await fetch(SCAN, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-scan-key": CLAVE },
        body: JSON.stringify({ url: `https://${d}`, sitio: "" }),
      });
      if (!r.ok) {
        descartes.push(`${d};rate-limit;HTTP ${r.status}`);
        continue;
      }
      scan = (await r.json()).resultado;
    } catch (e) {
      descartes.push(`${d};error;${String(e.message).slice(0, 40)}`);
      continue;
    }

    if (!scan || scan.estado === "fallido") {
      descartes.push(`${d};ilegible;`);
      continue;
    }

    const sinAviso = (scan.detecciones ?? []).filter(
      (x) => ["chatbot", "avatar", "voz"].includes(x.tipo) && !x.conAviso
    );
    if (!sinAviso.length) {
      descartes.push(`${d};cumple;`);
      continue;
    }

    const em = await emailDe(d);
    if (!em) {
      descartes.push(`${d};sin-email;${sinAviso.map((x) => x.proveedor).join("+")}`);
      continue;
    }

    cola.push(`${d.split(".")[0]};${d};;${em.email};${sinAviso.map((x) => x.proveedor).join(" + ")};/`);
    log(`  ✓ ${d} · ${em.email} · ${sinAviso.map((x) => x.proveedor).join("+")}`);
  }

  await guardarProcesados(procesados);

  // Añadir a la cola existente sin duplicar.
  let cabecera = "empresa;dominio;nombre;email;evidencia;ruta";
  let previas = [];
  if (existsSync(COLA)) {
    const l = (await readFile(COLA, "utf8")).split(/\r?\n/).filter(Boolean);
    cabecera = l[0] ?? cabecera;
    previas = l.slice(1);
  }
  const vistos = new Set(previas.map((l) => l.split(";")[3]?.toLowerCase()));
  const nuevos = cola.filter((l) => {
    const e = l.split(";")[3]?.toLowerCase();
    if (!e || vistos.has(e)) return false;
    vistos.add(e);
    return true;
  });

  await writeFile(COLA, [cabecera, ...previas, ...nuevos].join("\n") + "\n", "utf8");
  await writeFile("docs/outreach/descartados.csv", "dominio;motivo;detalle\n" + descartes.join("\n") + "\n", "utf8");

  log(`RESUMEN · escaneados ${pendientes.length} · cola ${nuevos.length} nuevos · descartados ${descartes.length}`);
  const porMotivo = {};
  for (const d of descartes) {
    const m = d.split(";")[1];
    porMotivo[m] = (porMotivo[m] ?? 0) + 1;
  }
  for (const [m, n] of Object.entries(porMotivo).sort((a, b) => b[1] - a[1])) log(`  ${m.padEnd(14)} ${n}`);
})();