#!/usr/bin/env node
/**
 * Auditoría de firmas del escáner.
 *
 * El matcher busca cada token de `scripts` dentro del HTML COMPLETO. Eso está
 * bien para un dominio como `static.zdassets.com` y es una Ae泰thin para un
 * token suelto como `zE`: "ze" aparece en cualquier página y hacía que sitios sin
 * Zendesk salieran como Zendesk. Con 14 de 17 sitios marcados, y todos "Zendesk",
 * la primera hipótesis debería haber sido "mi escáner miente", no "el mercado
 * incumple masivamente".
 *
 * Esta auditoría lista los tokens que pueden dar un falso positivo y comprueba
 * cuántos de ellos aparecen en una página que NO los usa.
 */

import { readFile } from "node:fs/promises";

const SRC = "src/lib/scanner/signatures.ts";

const fuente = await readFile(SRC, "utf8");

// Extraer bloques de firma: proveedor + scripts + selectores + globals
const bloques = [...fuente.matchAll(/proveedor:\s*"([^"]+)"([\s\S]*?)(?=proveedor:\s*"|\n\];)/g)];

console.log(`\n  AUDITORÍA DE FIRMAS · ${bloques.length} firmas\n`);

// Un token es de riesgo si no contiene un punto ni una barra: no puede ser un
// dominio ni una ruta, así que solo puede aparecer por casualidad en el texto.
const esDeRiesgo = (t) => !/[./]/.test(t) && !/^window\./.test(t) && t.length <= 12;

const riesgos = [];

for (const [, proveedor, cuerpo] of bloques) {
  const campos = {};
  for (const clave of ["scripts", "selectores", "globals"]) {
    const m = cuerpo.match(new RegExp(`${clave}:\\s*\\[([^\\]]*)\\]`));
    if (!m) continue;
    campos[clave] = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  }
  const malos = [];
  for (const [campo, tokens] of Object.entries(campos)) {
    for (const t of tokens) {
      const limpio = campo === "selectores" ? t.replace(/[[\]#.:*]/g, "") : t;
      if (esDeRiesgo(limpio)) malos.push({ campo, token: t, limpio });
    }
  }
  if (malos.length) riesgos.push({ proveedor, malos });
}

if (!riesgos.length) {
  console.log("  Ningún token de riesgo.\n");
} else {
  console.log("  Firma".padEnd(30) + "Token suelto (falso positivo probable)");
  console.log("  " + "─".repeat(78));
  for (const r of riesgos) {
    console.log("  " + r.proveedor.padEnd(28) + r.malos.map((m) => `${m.token} [${m.campo}]`).join("  "));
  }
  console.log("");
}

// Comprobación empírica: ¿cuántos de estos tokens casan en una página limpia?
const PAGINA_LIMPIA =
  "https://www.boe.es/buscar/act.php?id=BOE-A-2024-1689 <html><body>" +
  "<p>Empresas de &#243;rdenes&#160;y z&#243;calos con &#225;lbum de &#225;rb&#160;d&#243;l.</p>" +
  "<script src='/js/zoom.js'></script></body></html>";

const plano = PAGINA_LIMPIA.toLowerCase();
console.log("  Prueba sobre una página que NO contiene ninguno de esos productos:");
let falsos = 0;
for (const r of riesgos) {
  for (const m of r.malos) {
    if (plano.includes(m.limpio.toLowerCase())) {
      console.log(`    ✗ "${m.limpio}" (${r.proveedor}) SÍ aparece → falso positivo garantizado`);
      falsos++;
    }
  }
}
if (!falsos) console.log("    ninguno aparece (esta página concreta no los dispara)");
console.log("");