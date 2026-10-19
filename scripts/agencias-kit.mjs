#!/usr/bin/env node
/**
 * Extrae emails publicados por las agencias de IA de agentes.ai.
 *
 * Razon de negocio: aunque la web de la agencia cumpla el Art. 50, una agencia
 * que vende IA a sus clientes hereda su responsabilidad. Si un cliente de la
 * agencia recibe una queja o una multa, el problema vuelve a la agencia. Eso es
 * exactamente para lo que existe el Kit Agencias de 499 €.
 *
 * El argumento no es "tu web incumple", que seria falso para la mayoria. Es
 * "comprueba a tus clientes antes de que te lo pidan".
 *
 * Solo se recogen direcciones publicadas en la propia web. Nunca se adivinan.
 */

import { readFile, writeFile } from "node:fs/promises";

const UA = { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)" };

const RUIDO =
  /(sentry|wixpress|godaddy|squarespace|example|facebook|instagram|twitter|youtube|linkedin|pinterest|tiktok|amazon|wordpress|schema\.org|w3\.org|vercel\.app|github|jquery|bootstrap|google\.|doubleclick|hotjar|posthog|cdn\.|assets|shopify|stripe|paypal|hubspot|intercom|drift|bitly|gstatic|googleapis|cloudfront|amazonaws|s3\.|beacons|mapbox)/i;

/** Casillas a las que no se escribe nunca. */
const NO_ESCRIBIR = /^(rgpd|lopd|dpo|legal|abuse|postmaster|hostmaster|spam|protecciondatos|info@localhost)/i;

const RUTAS = ["/", "/contacto", "/contact", "/contact-us", "/aviso-legal", "/privacidad"];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function htmlDe(url, ms = 8000) {
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

async function emailsDe(dominio) {
  const hallados = new Map();
  for (const r of RUTAS) {
    if (hallados.size >= 3) break;
    const html = await htmlDe(`https://${dominio}${r}`);
    if (!html) continue;
    for (const m of html.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)) {
      const e = m[1].toLowerCase();
      if (RUIDO.test(e) || NO_ESCRIBIR.test(e)) continue;
      const dom = e.split("@")[1];
      if ((dom === dominio || dom.endsWith("." + dominio)) && !hallados.has(e)) {
        hallados.set(e, {
          email: e,
          generico: /^(info|contacto|contact|hola|hello|admin|general|ventas|sales|marketing|ayuda|clientes|comercial)/.test(
            e.split("@")[0]
          ),
        });
      }
    }
    await dormir(120);
  }
  return [...hallados.values()].sort((a, b) => (a.generico === b.generico ? 0 : a.generico ? 1 : -1));
}

(async () => {
  const entrada = process.argv[2] ?? "docs/outreach/dominios-agencias.txt";
  const salida = process.argv[3] ?? "docs/outreach/agencias-kit.csv";

  const dominios = (await readFile(entrada, "utf8"))
    .split(/\r?\n/)
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.includes(".") && !RUIDO.test(d));

  console.log(`\n  Emails de agencias de IA · ${dominios.length} dominios\n`);

  const filas = [];
  let conMail = 0;

  for (const [i, d] of dominios.entries()) {
    if (i % 10 === 9) console.log(`  ${i + 1}/${dominios.length} · ${conMail} con email`);
    const em = await emailsDe(d);
    if (!em.length) continue;
    conMail++;
    // Se prioriza la persona concreta; la genérica se guarda aparte por si acaso.
    const elegido = em.find((x) => !x.generico) ?? em[0];
    filas.push(`${d.split(".")[0]};${d};;${elegido.email};agencia IA;${em.length} encontrados`);
    console.log(`  ✓ ${d.padEnd(34)} ${elegido.email}`);
    await dormir(100);
  }

  await writeFile(
    salida,
    ["empresa;dominio;nombre;email;evidencia;ruta", ...filas].join("\n") + "\n",
    "utf8"
  );

  console.log(`\n  RESULTADO: ${conMail} de ${dominios.length} agencias con email publicado`);
  console.log(`  escrito en ${salida}\n`);
})();