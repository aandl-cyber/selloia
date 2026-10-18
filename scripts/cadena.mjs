#!/usr/bin/env node
/**
 * Cadena completa, encadenada y desatendida.
 *
 *   dominios.txt --> escaneo rapido --> verifica emails --> cola --> EMISOR
 *
 * Se ejecuta una vez y sigue sola hasta agotar la lista. El emisor arranca
 * cuando la cola está lista, de modo que no se pierde tiempo entre pasos.
 */

import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)" };
const SCAN = "https://sello-ia.com/api/scan?rapido=1";

const ENTRADA = process.argv[2] ?? "docs/outreach/dominios-agencias.txt";
const COLA = "docs/outreach/cola-envio.csv";
const HORAS = process.argv[3] ?? "12";
const POR_HORA = process.argv[4] ?? "13";

const MALOS =
  /(sentry|wixpress|godaddy|squarespace|cloudflare|example|facebook|instagram|twitter|youtube|linkedin|pinterest|tiktok|amazon|wordpress|schema\.org|w3\.org|vercel\.app|github|jquery|bootstrap|google|doubleclick|hotjar|posthog|ashbyhq|cdn|assets|mail|shopify|stripe|paypal|hubspot|intercom|drift|bitly|gstatic|googleapis|cloudfront|beacons|mapbox|openstreetmap)/i;

const GENERICOS =
  /^(info|contacto|contact|hola|hello|admin|general|ventas|sales|marketing|prensa|ayuda|support|clientes|comercial|direccion|recepcion)/i;

const RUTAS = ["/", "/contacto", "/contact", "/contact-us", "/privacidad", "/aviso-legal"];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

async function emailsDe(d) {
  const hallados = new Map();
  for (const r of RUTAS) {
    if (hallados.size >= 2) break;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 7000);
    try {
      const res = await fetch(`https://${d}${r}`, { redirect: "follow", signal: ctrl.signal, headers: { ...UA, Accept: "text/html" } });
      clearTimeout(to);
      if (!res.ok) continue;
      const html = (await res.text()).slice(0, 800_000);
      for (const m of html.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)) {
        const e = m[1].toLowerCase();
        if (MALOS.test(e)) continue;
        const dom = e.split("@")[1];
        if ((dom === d || dom.endsWith("." + d)) && !hallados.has(e)) {
          hallados.set(e, { email: e, generico: GENERICOS.test(e.split("@")[0]) });
        }
      }
    } catch { /* ruta fallida */ } finally { clearTimeout(to); }
  }
  return [...hallados.values()].sort((a, b) => (a.generico === b.generico ? 0 : a.generico ? 1 : -1));
}

(async () => {
  const dominios = (await readFile(ENTRADA, "utf8"))
    .split(/\r?\n/)
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.includes(".") && !MALOS.test(d));

  log(`dominios de entrada: ${dominios.length}`);
  log("fase 1/2 · escaneo rápido");

  const filas = [];
  let conInc = 0;

  for (let i = 0; i < dominios.length; i++) {
    const d = dominios[i];
    if (i % 25 === 0) log(`  ${i}/${dominios.length} · ${filas.length} listos`);

    try {
      const r = await fetch(SCAN, { method: "POST", headers: { "Content-Type": "application/json", "x-scan-key": process.env.SCAN_API_KEY ?? "" }, body: JSON.stringify({ url: `https://${d}`, sitio: "" }) });
      const j = await r.json();
      if (j.error || !j.resultado || j.resultado.estado === "fallido") continue;

      const res = j.resultado;
      const sinAviso = res.detecciones.filter((x) => ["chatbot", "avatar", "voz"].includes(x.tipo) && !x.conAviso);
      if (!sinAviso.length) continue;

      conInc++;
      const clave = sinAviso.map((x) => x.proveedor).join(" + ");
      const em = await emailsDe(d);
      const e = em.find((x) => !x.generico) ?? em[0];
      if (e) filas.push(`${d.split(".")[0]};${d};;${e.email};${clave};/`);
    } catch { /* fallo puntual */ }
    await dormir(80);
  }

  log(`escaneados ${dominios.length} · ${conInc} con IA sin aviso · ${filas.length} con email`);

  // Deduplicar contra lo ya enviado.
  let ya = [];
  try {
    const e = JSON.parse(await readFile(".datos/emisor-estado.json", "utf8"));
    ya = (e.enviados ?? []).map((x) => String(x).toLowerCase());
  } catch { /* primer arranque */ }

  const vistos = new Set(ya);
  const nuevos = filas.filter((l) => {
    const m = l.split(";")[3].toLowerCase();
    if (vistos.has(m)) return false;
    vistos.add(m);
    return true;
  });

  await writeFile(COLA, ["empresa;dominio;nombre;email;evidencia;ruta", ...nuevos].join("\n") + "\n", "utf8");
  log(`cola: ${nuevos.length} nuevos (${filas.length - nuevos.length} duplicados descartados)`);

  if (!nuevos.length) {
    log("nada nuevo. No se lanza el emisor.");
    return;
  }

  log(`fase 2/2 · lanzando emisor ${HORAS} h a ${POR_HORA}/hora`);
  const hijo = spawn(
    process.execPath,
    ["scripts/emisor-autonomo.mjs", `--cola=${COLA}`, `--horas=${HORAS}`, `--por-hora=${POR_HORA}`, "--tope-diario=95"],
    { stdio: "inherit" }
  );
  hijo.on("exit", (c) => log(`emisor terminado (${c})`));
})();