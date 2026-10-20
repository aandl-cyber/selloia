#!/usr/bin/env node
/**
 * Prueba de regresión del detector de firmas.
 *
 * Por qué existe: el escáner declaraba Zendesk en el 100% de las webs. La firma
 * era el literal `zE`, y se buscaba como subcadena en el HTML entero: "ze" sale
 * en Wikipedia, en el BOE y en GitHub. Peor todavía, `zE` era subcadena de
 * "breeze-minification.js", el plugin de caché de WordPress, así que cualquier
 * wordpress español salía como Zendesk.
 *
 * Con eso, 258 de 564 dominiosappeared "con IA sin aviso" cuando en realidad
 * casi ninguno se había mirado, y la cola de prospección entera se llenó de
 * falsos positivos. De 6 prospectos españoles verificados a mano, solo 1
 * sobrevivió al arreglo.
 *
 * Una prueba que depende de la red se rompe sola. Estas páginas están en disco:
 * son recortes reales de sitios que NO usan IA y que el escáner marcaba.
 */

import { readFile, readdir } from "node:fs/promises";

const DIR = "src/lib/scanner/__fixtures__";

// ── El matcher, replicado tal cual está en analyze.ts ────────────────────────
// Si cambia allí, hay que cambiarlo aquí: eso es lo que hace que la prueba
// signifique algo en vez de dar un falso verde.

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function sinCadenas(js) {
  return js
    .replace(/`(?:\\.|[^`\\])*`/g, " ")
    .replace(/"(?:\\.|[^"\\])*"/g, " ")
    .replace(/'(?:\\.|[^'\\])*'/g, " ");
}
function codigoJs(html) {
  const partes = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1] ?? "";
    const tipo = attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)?.[1]?.toLowerCase();
    if (tipo && !/^(module|text\/javascript|application\/javascript|text\/jsx)$/.test(tipo)) continue;
    if (/json/.test(tipo ?? "")) continue;
    partes.push(m[2] ?? "");
  }
  return partes.join("\n");
}
function scriptsDeclarados(html) {
  return [...new Set([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]))];
}
function corpusDeAtributos(html) {
  const etiquetas = html.match(/<[^>]+>/g)?.join("\n") ?? "";
  return etiquetas.replace(/<a\b[^>]*>/gi, "").toLowerCase();
}
function tokenEsDelicado(token) {
  return !/[./]/.test(token);
}
function comoIdentificador(js, token) {
  return new RegExp(`(?:^|[^a-z0-9_$.])${escapeRegExp(token)}(?:[^a-z0-9_$]|$)`, "i").test(sinCadenas(js));
}
function enUrlDeScript(urls, token) {
  const t = token.toLowerCase();
  if (!tokenEsDelicado(t)) return urls.some((u) => u.includes(t));
  const patron = new RegExp(`(?:^|[/._-])${escapeRegExp(t)}(?:[/._-]|$)`, "i");
  return urls.some((u) => patron.test(u));
}
function firmaCoincide(f, html, scripts) {
  const corpus = corpusDeAtributos(html);
  const js = codigoJs(html);
  const urls = scripts.map((s) => s.toLowerCase());
  for (const s of f.scripts ?? []) {
    const alvo = s.toLowerCase();
    if (enUrlDeScript(urls, alvo)) return { firma: s, tipo: "script" };
    if (tokenEsDelicado(alvo)) {
      if (comoIdentificador(js, alvo)) return { firma: s, tipo: "script" };
    } else if (corpus.includes(alvo)) return { firma: s, tipo: "script" };
  }
  for (const g of f.globals ?? []) {
    const alvo = g.toLowerCase();
    if (enUrlDeScript(urls, alvo)) return { firma: g, tipo: "script" };
    if (comoIdentificador(js, alvo)) return { firma: g, tipo: "script" };
  }
  return null;
}

// ── Cargar firmas reales del código fuente ───────────────────────────────────

const fuente = await readFile("src/lib/scanner/signatures.ts", "utf8");
const bloques = [...fuente.matchAll(/proveedor:\s*"([^"]+)"([\s\S]*?)(?=proveedor:\s*"|\n\];)/g)];
const FIRMAS = bloques.map(([, proveedor, cuerpo]) => {
  const leer = (clave) => {
    const m = cuerpo.match(new RegExp(`${clave}:\\s*\\[([^\\]]*)\\]`));
    return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
  };
  return {
    proveedor,
    scripts: leer("scripts"),
    globals: leer("globals"),
    selectores: leer("selectores"),
  };
});

console.log(`\n  REGRESIÓN DEL DETECTOR · ${FIRMAS.length} firmas · ${DIR}\n`);

let fallos = 0;

// ── 1. Ninguna web limpia puede producir una detección ───────────────────────

const fijas = await readdir(DIR).catch(() => []);
const limpias = fijas.filter((f) => f.endsWith(".html") && !f.startsWith("positivo-"));

if (!limpias.length) {
  console.log("  ✗ No hay recortes de control en __fixtures__. Sin ellos esta prueba no prueba nada.");
  process.exit(1);
}

for (const archivo of limpias) {
  const html = await readFile(`${DIR}/${archivo}`, "utf8");
  const scripts = scriptsDeclarados(html);
  const detectados = FIRMAS.filter((f) => firmaCoincide(f, html, scripts)).map((f) => f.proveedor);
  const nombre = archivo.replace(/\.html$/, "");
  if (detectados.length) {
    fallos++;
    console.log(`  ✗ ${nombre.padEnd(28)} marca ${detectados.join(", ")} · debería marcar NADA`);
  } else {
    console.log(`  ✓ ${nombre.padEnd(28)} limpio`);
  }
}

// ── 2. Las webs con IA real tienen que seguir detectándose ───────────────────

const positivas = fijas.filter((f) => f.startsWith("positivo-") && f.endsWith(".html"));
for (const archivo of positivas) {
  const nombre = archivo.replace(/\.html$/, "").replace("positivo-", "");
  const esperado = nombre.split("--").pop().replace(/-/g, " ");
  const html = await readFile(`${DIR}/${archivo}`, "utf8");
  const scripts = scriptsDeclarados(html);
  const detectados = FIRMAS.filter((f) => firmaCoincide(f, html, scripts)).map((f) => f.proveedor);
  const ok = detectados.some((d) => d.toLowerCase().includes(esperado.toLowerCase().split(" ")[0]));
  if (!ok) {
    fallos++;
    console.log(`  ✗ ${nombre.padEnd(28)} esperaba ${esperado} · detectó ${detectados.join(", ") || "nada"}`);
  } else {
    console.log(`  ✓ ${nombre.padEnd(28)} detectado: ${detectados.join(", ")}`);
  }
}

// ── 3. La trampa concreta que provocó el fallo ───────────────────────────────

const breeze = await readFile(`${DIR}/wordpress-breeze-minification.html`, "utf8").catch(() => null);
if (breeze) {
  const scripts = scriptsDeclarados(breeze);
  const zendesk = FIRMAS.find((f) => f.proveedor === "Zendesk");
  if (firmaCoincide(zendesk, breeze, scripts)) {
    fallos++;
    console.log("  ✗ la URL breeze-minification.js vuelve a parecer Zendesk");
  } else {
    console.log("  ✓ breeze-minification.js NO se confunde con Zendesk");
  }
}

console.log("");
if (fallos) {
  console.log(`  ${fallos} FALLO(S). El detector no es fiable todavía.\n`);
  process.exit(1);
}
console.log("  Todo correcto. El detector distingue IA real de ruido.\n");