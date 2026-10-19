#!/usr/bin/env node
/**
 * Diagnóstico: qué token dispara cada detección y por qué vía.
 *
 * Responde a la pregunta que el escáner no contesta: cuando marca algo, ¿es por
 * la URL de un script, por un identificador en JavaScript, o por una coincidencia
 * suelta en el texto? Solo la segunda y la primera son pruebas válidas.
 */

import { readFile } from "node:fs/promises";

const OBJETIVO = process.argv[2] ?? "https://sello-ia.com";
const UA = { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0)" };

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const del = (t) => !/[./]/.test(t);

/** El contenido de los scripts inline incluye el texto de la página (RSC de
 *  Next.js). Solo cuentan los identificadores, no las cadenas. */
const sinCadenas = (js) =>
  js.replace(/`(?:\\.|[^`\\])*`/g, " ").replace(/"(?:\\.|[^"\\])*"/g, " ").replace(/'(?:\\.|[^'\\])*'/g, " ");

function codigoJs(html) {
  const p = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const a = m[1] ?? "";
    const t = a.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1]?.toLowerCase();
    if (t && !/^(module|text\/javascript|application\/javascript|text\/jsx)$/.test(t)) continue;
    if (/json/.test(t ?? "")) continue;
    p.push(m[2] ?? "");
  }
  return p.join("\n");
}
const decl = (html) => [...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]))];
const ident = (js, t) =>
  new RegExp(`(?:^|[^a-z0-9_$.])${esc(t)}(?:[^a-z0-9_$]|$)`, "i").test(sinCadenas(js));
function enUrl(urls, t) {
  const x = t.toLowerCase();
  if (!del(x)) return urls.some((u) => u.includes(x));
  return urls.some((u) => new RegExp(`(?:^|[/._-])${esc(x)}(?:[/._-]|$)`, "i").test(u));
}

function coincide(f, html, scripts) {
  const corpus = html.toLowerCase();
  const js = codigoJs(html);
  const urls = scripts.map((s) => s.toLowerCase());

  for (const s of f.scripts ?? []) {
    const a = s.toLowerCase();
    if (enUrl(urls, a)) return { token: s, via: "URL de script", ok: true };
    if (del(a)) {
      if (ident(js, a)) return { token: s, via: "identificador JS", ok: true };
    } else if (corpus.includes(a)) return { token: s, via: "texto del documento", ok: false };
  }
  for (const g of f.globals ?? []) {
    const a = g.toLowerCase();
    if (enUrl(urls, a)) return { token: g, via: "URL de script", ok: true };
    if (ident(js, a)) return { token: g, via: "identificador JS", ok: true };
  }
  for (const sel of f.selectores ?? []) {
    const l = sel.replace(/[[\]#.:*]/g, "").toLowerCase();
    if (l.length <= 3) continue;
    if (del(l)) {
      const marcado = new RegExp(`(?:id|class)\\s*=\\s*["'][^"']*\\b${esc(l)}\\b`, "i").test(html);
      if (marcado) return { token: sel, via: "id/class en el marcado", ok: true };
      if (ident(js, l)) return { token: sel, via: "identificador JS", ok: true };
    } else if (corpus.includes(l)) return { token: sel, via: "texto del documento", ok: false };
  }
  return null;
}

const src = await readFile("src/lib/scanner/signatures.ts", "utf8");
const FIRMAS = [...src.matchAll(/proveedor:\s*"([^"]+)"([\s\S]*?)(?=proveedor:\s*"|\n\];)/g)].map(([, p, c]) => {
  const L = (k) => {
    const m = c.match(new RegExp(`${k}:\\s*\\[([^\\]]*)\\]`));
    return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  };
  return { proveedor: p, scripts: L("scripts"), globals: L("globals"), selectores: L("selectores") };
});

const html = await (await fetch(OBJETIVO, { headers: UA })).text();
const scripts = decl(html);

console.log(`\n  DIAGNÓSTICO · ${OBJETIVO}`);
console.log(`  ${html.length} bytes · ${scripts.length} scripts · ${codigoJs(html).length} bytes de JS\n`);

const findings = [];
for (const f of FIRMAS) {
  const h = coincide(f, html, scripts);
  if (h) findings.push({ ...f, h });
}

if (!findings.length) {
  console.log("  Sin detecciones.\n");
} else {
  for (const f of findings) {
    const marca = f.h.ok ? "OK " : "MAL";
    console.log(`  ${marca} ${f.proveedor.padEnd(26)} "${f.h.token}"  vía: ${f.h.via}`);
  }
  const malas = findings.filter((f) => !f.h.ok).length;
  console.log(`\n  ${findings.length} detecciones · ${malas} apoyadas solo en texto del documento\n`);
}