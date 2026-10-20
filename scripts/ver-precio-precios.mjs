/**
 * Comprueba qué precio está sirviendo realmente la página de /precios en
 * producción: título, meta descripción y recuento de apariciones.
 *
 * Por qué existe: Google indexó /precios y su fragmento decía "SelloIA Pro a
 * 39 €/mes", un precio que no está en el código fuente. Antes de creer que es
 * caché vieja, hay que mirar qué sirve la web ahora.
 */

(async () => {
  const r = await fetch("https://sello-ia.com/precios", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0)" },
  });
  const html = await r.text();
  const metas = [...html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/gi)];
  for (const m of metas) console.log("  META: " + m[1]);
  const title = html.match(/<title>([^<]+)<\/title>/i);
  if (title) console.log("  TITLE: " + title[1]);
  const n1999 = (html.match(/19,99/g) || []).length;
  const n39 = (html.match(/39\s*€/g) || []).length;
  const n499 = (html.match(/499\s*€/g) || []).length;
  console.log(`  apariciones · 19,99: ${n1999} · 39 €: ${n39} · 499 €: ${n499}`);
})();
