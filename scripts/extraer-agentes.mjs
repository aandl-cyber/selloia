#!/usr/bin/env node
/**
 * Extrae las agencias del directorio agentes.ai
 *
 * Es un directorio de agencias de IA en España, que es exactamente el cliente
 * que busca el Kit Agencias: usa IA en su propia web, tiene presupuesto y
 * revende a sus clientes. La web es una SPA y no expone los dominios en el HTML,
 * así que se buscan las rutas de datos que usa por debajo.
 */

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/json",
};

async function pedir(url, ms = 30000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: UA, signal: ctrl.signal, redirect: "follow" });
    return { s: r.status, h: await r.text(), ct: r.headers.get("content-type") ?? "" };
  } catch {
    return { s: 0, h: "", ct: "" };
  } finally {
    clearTimeout(to);
  }
}

const RUIDO = /(agentes\.ai|google|facebook|twitter|linkedin|youtube|instagram|gstatic|doubleclick|cloudflare|cdn|fonts|schema\.org|w3\.org|vercel|sentry|amazonaws|stripe|bootstrap|jquery|execute-api|crunchbase)/i;

(async () => {
  const r = await pedir("https://www.agentes.ai/agencias/");
  console.log(`\n  agentes.ai/agencias/ → HTTP ${r.s} · ${r.h.length} bytes\n`);

  // 1. Rutas de API declaradas en los scripts
  const rutas = [
  ...new Set(
    [...r.h.matchAll(/["'`](\/(?:api|trpc|_next\/data)[a-zA-Z0-9_\-/.[\]]*)["'`]/g)].map((m) => m[1])
  ),
];
  console.log(`  rutas de API en el HTML: ${rutas.length ? rutas.slice(0, 8).join(" | ") : "ninguna"}`);

  // 2. Dominios externos presentes en el HTML
  const ext = [...new Set([...r.h.matchAll(/https?:\/\/([a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g)].map((m) => m[1].toLowerCase().replace(/^www\./, "")))];
  const ajenos = ext.filter((d) => !RUIDO.test(d));
  console.log(`  dominios externos en el HTML: ${ajenos.length}`);
  if (ajenos.length) console.log(`    ${ajenos.slice(0, 20).join("\n    ")}`);

  // 3. Datos estructurados o JSON embebido
  for (const etiqueta of ["__NEXT_DATA__", "__NUXT__", "__DATA__", "application/ld+json"]) {
    if (r.h.includes(etiqueta)) console.log(`  contiene ${etiqueta}`);
  }

  // 4. Texto visible: nombres de agencias aunque no haya dominios
  const txt = r.h
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, "|");
  const trozos = txt.split("|").map((s) => s.trim()).filter((s) => s.length > 3 && s.length < 45);
  console.log(`\n  texto visible (${trozos.length} fragmentos):`);
  console.log(`    ${trozos.slice(5, 30).join(" / ")}`);

  // 5. ¿Cuántas tarjetas de agencia hay? Busca el patrón repetido
  const tarjetas = (r.h.match(/agencia/gi) ?? []).length;
  console.log(`\n  menciones de "agencia" en el HTML: ${tarjetas}`);
  console.log(`  (si es alto, los datos vienen por JS y hay que llamar a la API)\n`);
})();