#!/usr/bin/env node
/**
 * Reintento dirigido de las dos fuentes que valen la pena.
 *
 * urlscan.io devolvio 403 por el User-Agent de robot. Su API es gratuita y tiene
 * cobertura enorme, asi que merece un intento con cabeceras de navegador.
 *
 * crt.sh aborto por timeout en la consulta wildcard. Se prueba con `limit`, que
 * hace la consulta mucho mas barata para su servidor, y con reintentos.
 */

const UA_BROWSER = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "application/json, text/html;q=0.9",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  Referer: "https://urlscan.io/",
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(url, ms = 45000, headers = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: { ...UA_BROWSER, ...headers }, signal: ctrl.signal, redirect: "follow" });
    return { status: r.status, texto: await r.text(), ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, texto: "", ms: Date.now() - t0, error: String(e.message).slice(0, 50) };
  } finally {
    clearTimeout(to);
  }
}

const soloEs = (d) => /\.es$/i.test(d) && d.split(".").length <= 3;

(async () => {
  console.log("\n  REINTENTO DE FUENTES\n");

  // ── urlscan.io ──────────────────────────────────────────────────────────
  console.log("  urlscan.io");
  for (const q of ["page.domain:*.es", "domain:*.es", "task.url:*./es/*"]) {
    const u = `https://urlscan.io/api/v1/search/?q=${encodeURIComponent(q)}&size=100`;
    const r = await pedir(u, 45000);
    if (r.status === 200) {
      let doms = [];
      try {
        const j = JSON.parse(r.texto);
        doms = [...new Set((j.results ?? []).map((x) => x.page?.domain).filter(Boolean))];
      } catch {}
      const es = doms.filter(soloEs);
      console.log(`    ${q.padEnd(24)} OK  ${String(es.length).padStart(4)} .es de ${doms.length} dominios (${r.ms} ms)`);
      if (es.length) console.log(`       ej: ${es.slice(0, 5).join(", ")}`);
    } else {
      console.log(`    ${q.padEnd(24)} HTTP ${r.status || r.error} (${r.ms} ms)`);
    }
    await dormir(1200);
  }

  // ── crt.sh con limit ────────────────────────────────────────────────────
  console.log("\n  crt.sh con limite");
  for (const intento of [1, 2, 3]) {
    const u = `https://crt.sh/?q=%25.es&output=json&exclude=expired&limit=${1000 * intento}`;
    const r = await pedir(u, 90000);
    if (r.status === 200) {
      const nombres = [...r.texto.matchAll(/"name_value":"([^"]+)"/g)].map((m) => m[1]);
      const base = [...new Set(nombres.flatMap((n) => n.split("\n")))].filter(soloEs);
      console.log(`    limit=${1000 * intento}  OK  ${base.length} dominios .es (${r.ms} ms)`);
      console.log(`       ej: ${base.slice(0, 5).join(", ")}`);
      break;
    }
    console.log(`    limit=${1000 * intento}  HTTP ${r.status || r.error} (${r.ms} ms)`);
    await dormir(2000);
  }

  console.log("");
})();