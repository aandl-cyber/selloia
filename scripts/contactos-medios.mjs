#!/usr/bin/env node
/**
 * Contactos publicados por quienes escriben sobre el Art. 50 hoy.
 *
 * Canal nuevo, distinto del cold email a empresas: la dozen de blogs y firmas
 * que están publicando sobre el AI Act en español necesitan Material para sus
 * artículos y herramientas que ilustrar una pieza. Aportar un escáner real con
 * datos es un intercambio, no una venta, así que el mensaje es otro.
 *
 * Solo se recogen direcciones que están publicadas en su propia web. Nunca se
 * adivinan ni se generan.
 */

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

const RUIDO =
  /(sentry|wixpress|godaddy|squarespace|example|facebook|instagram|twitter|youtube|linkedin|pinterest|tiktok|amazon|wordpress|schema\.org|w3\.org|vercel\.app|github|jquery|bootstrap|google\.|doubleclick|hotjar|posthog|cdn\.|shopify|stripe|paypal|hubspot|intercom|bitly|gstatic|googleapis|cloudfront|amazonaws|beacons|sentry\.io|domain|hosting|privacy)/i;

async function pedir(url, ms = 15000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: UA, signal: ctrl.signal, redirect: "follow" });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(to);
  }
}

const EMISORES = [
  ["aunoa.ai", "https://aunoa.ai/contacto/"],
  ["aunoa.ai (alt)", "https://aunoa.ai/contacto"],
  ["punto-fiscal.com", "https://punto-fiscal.com/es/contacto"],
  ["dribba.com", "https://dribba.com/contacto"],
  ["iagovernance.com", "https://iagovernance.com/contacto"],
  ["economistjurist.es", "https://www.economistjurist.es/contacto"],
  ["derechoartificial.com", "https://www.derechoartificial.com/contacto"],
  ["angelortegacastro.com", "https://angelortegacastro.com/contacto"],
  ["taifa.es", "https://taifa.es/contacto/"],
  ["ercel.ai", "https://ercel.ai/contacto"],
];

(async () => {
  console.log("\n  Contactos publicados de quien escribe sobre el Art. 50\n");

  const encontrados = [];
  for (const [nombre, url] of EMISORES) {
    const html = await pedir(url);
    if (!html) {
      console.log(`  ${nombre.padEnd(26)} sin respuesta`);
      continue;
    }
    const emails = [...new Set([...html.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)].map((m) => m[0].toLowerCase()))];
    const buenos = emails.filter((e) => !RUIDO.test(e) && !/^(legal|privacidad|abuse|postmaster|hostmaster)/.test(e));
    if (buenos.length) {
      console.log(`  ${nombre.padEnd(26)} ${buenos.length}: ${buenos.slice(0, 4).join(", ")}`);
      encontrados.push({ nombre, url, emails: buenos });
    } else {
      console.log(`  ${nombre.padEnd(26)} pagina ok, sin email publicable (${emails.length} filtrados)`);
    }
  }

  console.log(`\n  ${encontrados.length} fuentes con contacto publicado\n`);
})();