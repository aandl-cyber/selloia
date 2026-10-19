#!/usr/bin/env node
/**
 * Sonda de fuentes masivas de dominios .es
 *
 * El bloqueo actual no es el escaner (ya funciona) ni el email: es que no tengo
 * una lista de sitios españoles. Diez directorios probados, uno solo sirvio, y
 * devolvio 6 prospectos reales de 143.
 *
 * Este script no descarga nada. Solo responde una pregunta por fuente:
 * ¿cuántos dominios .es me da, y a qué velocidad? Con eso se decide cuál usar.
 */

const UA = { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)" };

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(url, { ms = 25000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: { ...UA, ...headers }, signal: ctrl.signal, redirect: "follow" });
    const texto = await r.text();
    return { status: r.status, texto, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, texto: "", ms: Date.now() - t0, error: String(e.message).slice(0, 60) };
  } finally {
    clearTimeout(to);
  }
}

const es = (d) => /\.es$/i.test(d);

function extraer(texto) {
  const out = new Set();
  for (const m of texto.matchAll(/([a-zA-Z0-9-]{2,40}\.es)\b/g)) out.add(m[1].toLowerCase());
  return out;
}

const FUENTES = [
  {
    nombre: "crt.sh (CT logs, wildcard .es)",
    peso: "registro de certificados, gratis",
    probar: async () => {
      const r = await pedir("https://crt.sh/?q=%25.es&output=json", { ms: 60000 });
      if (r.status !== 200) return { ok: false, motivo: `HTTP ${r.status || r.error}`, ms: r.ms };
      const nombres = [...r.texto.matchAll(/"name_value":"([^"]+)"/g)].map((m) => m[1]);
      return { ok: true, total: nombres.length, es: nombres.filter((n) => es(n)).length, ms: r.ms, muestra: nombres.slice(0, 3) };
    },
  },
  {
    nombre: "Common Crawl (indice, paginado)",
    peso: "indice publico de URLs",
    probar: async () => {
      const r = await pedir("https://index.commoncrawl.org/CC-MAIN-2025-30-index?url=*.es&matchType=domain&output=json&limit=200&pageSize=200", { ms: 60000 });
      if (r.status !== 200) return { ok: false, motivo: `HTTP ${r.status || r.error}`, ms: r.ms };
      const urls = r.texto.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l).url; } catch { return ""; } });
      const dominios = new Set(urls.filter(Boolean).map((u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } }));
      return { ok: true, total: urls.length, es: [...dominios].filter(es).length, ms: r.ms, muestra: [...dominios].slice(0, 3) };
    },
  },
  {
    nombre: "urlscan.io (busqueda publica)",
    peso: "sitios escaneados historicamente",
    probar: async () => {
      const r = await pedir("https://urlscan.io/api/v1/search/?q=page.domain:*.es&size=100", { ms: 40000 });
      if (r.status !== 200) return { ok: false, motivo: `HTTP ${r.status || r.error}`, ms: r.ms };
      let j;
      try { j = JSON.parse(r.texto); } catch { return { ok: false, motivo: "no es JSON", ms: r.ms }; }
      const doms = [...new Set((j.results ?? []).map((x) => x.page?.domain).filter(Boolean))];
      return { ok: true, total: doms.length, es: doms.filter(es).length, ms: r.ms, muestra: doms.slice(0, 3) };
    },
  },
  {
    nombre: "RapidDNS (subdominios via CT)",
    peso: "subdominios historicos",
    probar: async () => {
      const r = await pedir("https://rapiddns.io/subdomain/es?full=1", { ms: 30000 });
      if (r.status !== 200) return { ok: false, motivo: `HTTP ${r.status || r.error}`, ms: r.ms };
      const d = extraer(r.texto);
      return { ok: true, total: d.size, es: d.size, ms: r.ms, muestra: [...d].slice(0, 3) };
    },
  },
  {
    nombre: "DNS: AXFR del registro .es",
    peso: "zone file oficial",
    probar: async () => {
      const r = await pedir("https://www.nic.es/", { ms: 20000 });
      return { ok: false, motivo: `HTTP ${r.status || r.error} (AXFR requiere cliente DNS, no HTTP)`, ms: r.ms };
    },
  },
  {
    nombre: "Hacker News / reddit: sitios .es mencionados",
    peso: "solo prueba de conectividad",
    probar: async () => {
      const r = await pedir("https://hn.algolia.com/api/v1/search?query=site%3A.es&hitsPerPage=50", { ms: 20000 });
      return { ok: r.status === 200, motivo: `HTTP ${r.status}`, ms: r.ms, total: r.status === 200 ? (JSON.parse(r.texto).hits ?? []).length : 0 };
    },
  },
];

(async () => {
  console.log("\n  SONDEO DE FUENTES DE DOMINIOS .es\n");
  const resultados = [];

  for (const f of FUENTES) {
    process.stdout.write(`  ${f.nombre.padEnd(42)}`);
    let r;
    try {
      r = await f.probar();
    } catch (e) {
      r = { ok: false, motivo: String(e.message).slice(0, 60) };
    }
    resultados.push({ f, r });
    if (r.ok) {
      console.log(`OK  ${String(r.es ?? r.total ?? 0).padStart(6)} .es   (${r.total ?? "?"} total, ${r.ms} ms)`);
      if (r.muestra) console.log(`       ej: ${r.muestra.slice(0, 3).join(", ")}`);
    } else {
      console.log(`FALLA  ${r.motivo}`);
    }
    await dormir(400);
  }

  const buenas = resultados.filter((x) => x.r.ok && (x.r.es ?? 0) > 0);
  console.log("\n  ═══ USABLES ═══\n");
  if (!buenas.length) {
    console.log("  Ninguna fuente técnica entrega dominios .es.\n");
    console.log("  Conclusión: hay que discoveredominios por búsqueda web, que es lento.\n");
  } else {
    buenas
      .sort((a, b) => (b.r.es ?? 0) - (a.r.es ?? 0))
      .forEach((x, i) => console.log(`  ${i + 1}. ${x.f.nombre.padEnd(42)} ${x.r.es} .es en ${x.r.ms} ms`));
    console.log("");
  }
})();