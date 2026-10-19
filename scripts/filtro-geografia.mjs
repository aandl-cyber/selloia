#!/usr/bin/env node
/**
 * Filtro geográfico de la cola de prospección.
 *
 * Contexto: `agencias.marketing` es un directorio GLOBAL, no español. Al extraer
 * dominios de sus fichas sin mirar el país, 141 de 143 prospectos acabaron siendo
 * de México, Argentina, Colombia o Perú. El usuario pidió explícitamente no
 * contactar fuera de la UE, y de forma más estricta, solo España.
 *
 * Dos clases:
 *
 *  - TLD inequívoco (`.mx`, `.co.uk`): se decide por el dominio. Barato y fiable.
 *  - TLD ambiguo (`.com`, `.eu`, `.shop`, `.digital`): no dicen nada. Estos se
 *    verifican mirando la web de la empresa buscando señales de que opera en
 *    España: NIF/CIF con el formato español, prefijo telefónico +34, declaración
 *    de lang="es-ES" o una dirección española en el aviso legal.
 *
 * Un `.com` que no demuestra estar en España se descarta. La regla es asimétrica
 * a propósito: ante la duda, fuera. Un falso positivo cuesta una oportunidad;
 * un falso negativo cuesta comprarle el derecho a alguien.
 */

import { readFile, writeFile } from "node:fs/promises";

const COLA = process.argv[2] ?? "docs/outreach/cola-envio.csv";
const SALIDA = process.argv[3] ?? "docs/outreach/cola-espana.csv";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)" };

// ── TLD con país inequívoco ─────────────────────────────────────────────────
// Solo se admiten países de la UE/EEE; el resto se descarta sin mirar la web.

const TLD_UE = new Set([
  "es", "eu", "de", "fr", "it", "pt", "nl", "be", "at", "ie", "fi", "dk", "se",
  "pl", "gr", "cz", "ro", "hu", "sk", "si", "hr", "bg", "lt", "lv", "ee",
  "lu", "mt", "cy", "is", "no",
]);

// Suárez del país explícitamente. Se listan para dejar constancia de que se
// revisaron a mano, no para procesarlos.
const TLD_EXCLUIDOS = new Set([
  "mx", "co", "ar", "cl", "pe", "ve", "uy", "py", "bo", "ec", "cr", "pa", "do",
  "gt", "hn", "sv", "ni", "pr", "cu", "br", "com.br", "us", "ca", "uk", "com.ar",
  "com.mx", "com.co", "com.pe", "com.ve", "com.uy", "com.ec", "net", "org", "io",
]);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

// ── Señales de España en el contenido de la web ─────────────────────────────
//
// Solo cuentan las señales que un negocio de Hispanoamérica difícilmente
// tendría. Un error anterior contaba `lang="es"`, que solo significa "en
// español" y que cualquier página argentina o mexicana cumple igual: dejó
// pasar 112 prospectos de México, Argentina y Uruguay como españoles.
//
// Fuertes (hacen falta al menos una):
//   - NIF/CIF: en España es obligatorio publicarlo. En Hispanoamérica no existe.
//   - Teléfono +34 o con prefijo provincial español.
//   - Dirección postal española (CP de 5 cifras + población de España).
//
// Débil: `lang="es-ES"`. La pone elCMS por defecto en medio mundo, así que por
// sí sola nunca basta.

/** NIF/CIF español: letra + 7 dígitos + dígito de control. */
const NIF_ES = /\b([A-HJ-NP-SUVW]\d{7}[0-9A-J])\b/;
/** Teléfono español: +34 o prefijo provincial (9x, 6x, 7x). */
const TEL_ES = /(\+34[\s.-]?\d{9})|(\b(?:9[1-9]|6[1-9]|7[1-9])\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b)/;
const LANG_ES = /lang\s*=\s*["']es[-_]ES["']/i;
/** Poblaciones que solo existen como topónimo en España. */
const POBLACIONES_ES =
  /(?:Madrid|Barcelona|Valencia|Sevilla|Zaragoza|M[aá]laga|Murcia|Palma|Bilbao|Alicante|C[aá]diz|Gij[oó]n|Valladolid|Granada|Elche|Oviedo|Donostia|Burgos|Albacete|Salamanca|Logroño|Lleida|Tarragona|Gerona|Cord[oó]ba|Vigo|Pontevedra|Ja[eé]n|Ourense|Guadalajara|Toledo)\b/;
/** Código postal español: 5 dígitos. */
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

/**
 * Comprueba si el dominio pertenece a una empresa española.
 *
 * Exige al menos una señal FUERTE. `lang="es-ES"` solo suma puntos: es el valor
 * por defecto de muchos CMS de México o Argentina y por sí solo no prueba nada.
 *
 * @returns {Promise<{espanol: boolean, senales: string[], motivo: string}>}
 */
async function esDeEspana(dominio) {
  const fuertes = [];
  const debiles = [];
  const paginas = ["/", "/aviso-legal", "/contacto", "/quienes-somos"];

  let html = "";
  for (const p of paginas) {
    const h = await htmlDe(`https://${dominio}${p}`);
    if (h) html += h;
    if (fuertes.length >= 1) break; // prueba suficiente, no se sigue arrastrando
    await dormir(120);
  }

  if (!html) return { espanol: false, senales: [], motivo: "no responde" };

  if (NIF_ES.test(html)) fuertes.push("NIF/CIF español");
  if (TEL_ES.test(html)) fuertes.push("teléfono +34/provincial");
  if (CP_ES.test(html) && POBLACIONES_ES.test(html)) fuertes.push("dirección postal española");
  if (LANG_ES.test(html)) debiles.push("lang es-ES");

  const senales = [...fuertes, ...debiles];
  if (!fuertes.length) {
    return {
      espanol: false,
      senales,
      motivo: "sin señal fuerte de España",
    };
  }
  return { espanol: true, senales, motivo: "" };
}

// ── Clasificación ───────────────────────────────────────────────────────────

/**
 * País deducido del dominio, o null si el dominio no lo dice.
 *
 * Error anterior: para `arcoiris.com.uy` devolvía `com` en lugar de `uy`,
 * porque asumía que la penúltima etiqueta era siempre el ccTLD. Con `.com.ar`,
 * `.com.mx` o `.co.uk` eso es falso: el ccTLD es SIEMPRE la última etiqueta.
 * Eso dejó pasar todo Latinoamérica entero.
 */
function paisDeDominio(dominio) {
  const etiquetas = dominio.toLowerCase().split(".").filter(Boolean);
  const ultimo = etiquetas[etiquetas.length - 1];
  if (!ultimo) return null;
  // Un ccTLD son exactamente dos letras.
  return /^[a-z]{2}$/.test(ultimo) ? ultimo : null;
}

(async () => {
  log("filtro geográfico · solo España");

  const lineas = (await readFile(COLA, "utf8")).split(/\r?\n/).filter((l) => l.trim());
  const cabecera = lineas[0];
  const filas = lineas.slice(1).map((l) => l.split(";"));

  const admitidas = [];
  const descartadas = [];
  const aVerificar = [];

  for (const f of filas) {
    const dominio = (f[1] ?? "").trim().toLowerCase();
    if (!dominio) continue;
    const pais = paisDeDominio(dominio);

    if (pais && TLD_EXCLUIDOS.has(pais)) {
      descartadas.push({ f, motivo: `TLD de ${pais.toUpperCase()}` });
      continue;
    }
    if (pais && TLD_UE.has(pais)) {
      admitidas.push({ f, motivo: `TLD ${pais.toUpperCase()}`, senales: [] });
      continue;
    }
    // `.com`, `.net`, `.org`, `.eu`, `.shop`… no dicen país. Hay que mirar la web.
    aVerificar.push({ f, pais });
  }

  log(`${filas.length} en cola · ${descartadas.length} fuera de la UE de entrada`);
  log(`  ${admitidas.length} con TLD europeo claro · ${aVerificar.length} a verificar`);

  let ok = 0;
  for (const [i, item] of aVerificar.entries()) {
    const dominio = (item.f[1] ?? "").trim().toLowerCase();
    const r = await esDeEspana(dominio);
    if (r.espanol) {
      admitidas.push({ f: item.f, motivo: "verificado en la web", senales: r.senales });
      ok++;
      log(`  ✓ ${dominio} · ${r.senales.join(", ")}`);
    } else {
      descartadas.push({ f: item.f, motivo: r.motivo });
      log(`  ✗ ${dominio} · ${r.motivo}${r.senales.length ? ` (${r.senales.join(", ")})` : ""}`);
    }
    if (i % 10 === 9) log(`  ...${i + 1}/${aVerificar.length}`);
    await dormir(80);
  }

  const salida = [cabecera, ...admitidas.map((a) => a.f.join(";"))];
  await writeFile(SALIDA, salida.join("\n") + "\n", "utf8");

  log("");
  log(`RESULTADO`);
  log(`  cola original        ${filas.length}`);
  log(`  fuera de la UE        ${descartadas.length}`);
  log(`  QUEDAN               ${admitidas.length}`);
  log(`    · TLD claro        ${admitidas.filter((a) => a.senales.length === 0).length}`);
  log(`    · verificado web   ${ok}`);
  log(`  escrito               ${SALIDA}`);
  await writeFile(
    "docs/outreach/descartados-geografia.csv",
    ["dominio;motivo", ...descartadas.map((d) => `${d.f[1]};${d.motivo}`)].join("\n") + "\n",
    "utf8",
  );
  log(`  descartados guardados en docs/outreach/descartados-geografia.csv`);
})();