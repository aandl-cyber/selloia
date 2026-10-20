/**
 * Prueba si Empresite (el directorio oficial de empresas españolas de la
 * Cámara de Comercio) sirve listados con las webs de las empresas, para
 * usarlo como fuente de dominios y escanearlos con el escáner real.
 *
 * Por qué esta fuente y no otra: la lista anterior salía de un escáner roto y
 * solo 5 de 115 dominios eran reales. Empresite es un censo comercial oficial,
 * no un scrapeo de directorios de IA, así que el rendimiento esperado es muy
 * distinto: son empresas con web y con contacto publicado.
 */
const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-ES,es;q=0.9",
};

const PAGINAS = [
  "https://www.empresite.es/",
  "https://www.empresite.es/principal-espana/1/",
  "https://www.empresite.es/principal-espana/2/",
];

(async () => {
  for (const u of PAGINAS) {
    try {
      const r = await fetch(u, { headers: UA, redirect: "follow" });
      const html = await r.text();
      console.log(`=== ${u} → HTTP ${r.status} · ${html.length} chars ===`);

      // Enlaces salientes a webs de empresas (el href va en un redirect o en la ficha).
      const enlaces = [...html.matchAll(/href="([^"]+)"/g)]
        .map((m) => m[1])
        .filter((h) => /empresite\.es\/(ficha|empresa|directorio)/i.test(h))
        .slice(0, 6);
      for (const h of enlaces) console.log(`  ficha: ${h.slice(0, 90)}`);

      // ¿Pide captcha o bloqueo?
      if (/captcha|cloudflare|access denied|verificar que eres/i.test(html)) {
        console.log("  ⚠ bloqueo o captcha detectado");
      }
      console.log("");
    } catch (e) {
      console.log(`${u} → ${e.message}\n`);
    }
  }
})();
