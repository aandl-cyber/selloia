#!/usr/bin/env node
/**
 * Limpia la lista de agencias antes de usarla para escribir.
 *
 * La extracción en crudo trae tres tipos de basura que hay que quitar:
 *
 *  1. Emails mal codificados: `%20info@...` viene de una URL y `u003ecmercial@...`
 *     viene de una entidad HTML. Si se envían tal cual, rebotan y queman la
 *     reputación del dominio.
 *  2. Casillas que no se escriben: privacidad, aviso legal, legal, dpo. Nadie las
 *     lee y la queja por escribir a una casilla de privacidad es justa.
 *  3. Dominios que no son españoles: el directorio de agentes.ai es de España Y
 *     Latinoamérica, así que hay 者 `.co` y `.do` mezclados.
 *
 * No se inventa ninguna dirección: solo se corrigen las que se han encontrado
 * publicadas y se descartan las que no sirven.
 */

import { readFile, writeFile } from "node:fs/promises";

const entrada = process.argv[2] ?? "docs/outreach/agencias-kit.csv";
const salida = process.argv[3] ?? "docs/outreach/agencias-limpias.csv";

/** Casillas que no deben recibir correo comercial. */
const NO_ESCRIBIR =
  /^(rgpd|lopd|dpo|legal|privacidad|protecciondatos|avisolegal|avisolegal|abuse|postmaster|hostmaster|spam|unsubscribe|baja)/i;

/** TLD que identifican a un país que no es España. */
const NO_ES = new Set([
  "mx", "co", "ar", "cl", "pe", "uy", "ve", "br", "do", "gt", "hn", "sv", "ni",
  "pr", "cu", "bo", "ec", "py", "cr", "pa", "uk", "us", "ca", "it", "fr", "de",
]);

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Corrige las codificaciones que se cuelan al extraer del HTML. */
function limpiarEmail(e) {
  let x = e.trim().toLowerCase();
  try {
    x = decodeURIComponent(x);
  } catch {
    /* si no es percent-encoding válido, se deja como está */
  }
  // u003e, u003c y demás escapes hexadecimales de entidades HTML.
  x = x.replace(/u00([0-9a-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  x = x.replace(/^[^a-z0-9._%+-]+/, "");
  return x;
}

async function htmlDe(url, ms = 8000) {
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

/** Señales de que la empresa es española. */
async function esEspanola(dominio) {
  const tld = dominio.split(".").pop();
  if (tld === "es") return { ok: true, senal: ".es" };
  if (NO_ES.has(tld)) return { ok: false, senal: `.${tld}` };

  let h = "";
  for (const p of ["/", "/aviso-legal", "/contacto"]) {
    h += await htmlDe(`https://${dominio}${p}`);
    if (/NIF|CIF|\b\d{8}[A-HJ-NP-TV-Z]\b|\+\d?34[\s.-]?\d{9}/i.test(h)) break;
    await dormir(100);
  }
  if (!h) return { ok: false, senal: "no responde" };
  if (/\b[A-HJ-NP-SUVW]\d{7}[0-9A-J]\b/.test(h)) return { ok: true, senal: "NIF/CIF español" };
  if (/\+34[\s.-]?\d{9}/.test(h)) return { ok: true, senal: "teléfono +34" };
  if (/\b(Madrid|Barcelona|Valencia|Sevilla|Zaragoza|Málaga|Bilbao|Alicante)\b/i.test(h))
    return { ok: true, senal: "dirección española" };
  return { ok: false, senal: "sin señal de España" };
}

(async () => {
  const lineas = (await readFile(entrada, "utf8")).split(/\r?\n/).filter(Boolean);
  const cabecera = lineas[0] ?? "empresa;dominio;nombre;email;evidencia;ruta";
  const filas = lineas.slice(1).map((l) => l.split(";"));

  console.log(`\n  Limpieza de la lista · ${filas.length} entradas\n`);

  const limpios = [];
  const descartes = {};
  const visto = new Set();

  for (const [i, f] of filas.entries()) {
    if (i % 15 === 14) console.log(`  ${i + 1}/${filas.length} · ${limpios.length} válidos`);
    const dominio = (f[1] ?? "").trim().toLowerCase();
    let email = limpiarEmail(f[3] ?? "");

    const tira = (motivo) => {
      descartes[motivo] = (descartes[motivo] ?? 0) + 1;
    };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      tira("email ilegible");
      continue;
    }
    if (NO_ESCRIBIR.test(email.split("@")[0])) {
      tira("casilla legal o de privacidad");
      continue;
    }
    const domDelMail = email.split("@")[1];
    if (domDelMail !== dominio && !domDelMail.endsWith("." + dominio)) {
      // Se acepta, pero solo si es del mismo grupo (subdominio o母公司).
      if (!dominio.endsWith(domDelMail)) {
        tira("email de otro dominio");
        continue;
      }
    }

    const geo = await esEspanola(dominio);
    if (!geo.ok) {
      tira(`no española (${geo.senal})`);
      continue;
    }

    if (visto.has(email)) {
      tira("duplicado");
      continue;
    }
    visto.add(email);

    limpios.push(`${f[0]};${dominio};;${email};agencia IA;${geo.senal}`);
    console.log(`  ✓ ${dominio.padEnd(32)} ${email.padEnd(38)} ${geo.senal}`);
    await dormir(80);
  }

  await writeFile(salida, [cabecera, ...limpios].join("\n") + "\n", "utf8");

  console.log(`\n  ${limpios.length} de ${filas.length} utilizables`);
  for (const [m, n] of Object.entries(descartes).sort((a, b) => b[1] - a[1]))
    console.log(`    ${m.padEnd(32)} ${n}`);
  console.log(`\n  escrito en ${salida}\n`);
})();