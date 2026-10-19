#!/usr/bin/env node
/**
 * Sonda de directorios donde publicar SelloIA.
 *
 * Publicar en directorios es lo más barato que existe para ganar visitas: no
 * cuesta dinero, no hace falta audiencia previa y el tráfico viene de gente que
 * ya está buscando justo esto. El problema es que la mayoría exige registro o
 * bloquea, así que primero se comprueba cuáles se pueden usar de verdad.
 */

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

async function pedir(url, ms = 20000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: UA, signal: ctrl.signal, redirect: "follow" });
    return { status: r.status, html: r.ok ? await r.text() : "", url: r.url };
  } catch (e) {
    return { status: 0, html: "", url: "", error: String(e.message).slice(0, 45) };
  } finally {
    clearTimeout(to);
  }
}

const RUTAS = [
  ["directorioia.com", "https://www.directorioia.com/publicar-herramienta"],
  ["aifindy", "https://aifindy.ai/es/submit"],
  ["There's An AI For That", "https://theresanaiforthat.com/submit/"],
  ["Toolify", "https://www.toolify.ai/submit-tool"],
  ["Futurepedia", "https://www.futurepedia.io/submit"],
  ["Best AI Tools Directory", "https://bestaitoolsdirectory.com/submit"],
  ["AIxploria", "https://aixploria.com/submit-tool/"],
  ["Product Hunt", "https://www.producthunt.com/posts/new"],
];

(async () => {
  console.log("\n  ¿Dónde se puede publicar sinodrome de entrada?\n");

  const filas = [];
  for (const [nombre, url] of RUTAS) {
    const r = await pedir(url);
    if (r.error) {
      console.log(`  ${nombre.padEnd(28)} ERROR   ${r.error}`);
      continue;
    }
    const login = /iniciar sesi|crear cuenta|sign ?in|log ?in|type=["']password|registrate/i.test(r.html);
    const form = /<form/i.test(r.html);
    const campos = [...new Set([...r.html.matchAll(/<(?:input|textarea|select)[^>]*name=["']([^"']+)["']/gi)].map((m) => m[1]))];
    const usable = r.status === 200 && form && !login && campos.length > 0;
    filas.push({ nombre, url: r.url, usable, login, campos: campos.length });

    console.log(
      `  ${nombre.padEnd(28)} HTTP ${String(r.status).padEnd(4)} ${form ? "form" : "----"}  ${
        campos.length ? `${campos.length} campos` : "sin campos"
      }  ${login ? "PIDE CUENTA" : "abierto"}`
    );
    if (campos.length) console.log(`      campos: ${campos.slice(0, 8).join(", ")}`);
  }

  console.log("");
  const abiertas = filas.filter((f) => f.usable);
  console.log(`  ${abiertas.length} directorios abiertos de ${filas.length}:`);
  abiertas.forEach((f) => console.log(`    · ${f.nombre} → ${f.url}`));
  console.log("");
})();