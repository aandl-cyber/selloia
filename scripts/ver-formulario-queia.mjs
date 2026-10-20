/**
 * Mira el formulario de publicación de queia.es: qué campos pide y a qué
 * endpoint se manda, para saber si nuestra solicitud de listado sigue viva o
 * hay que reenviarla.
 *
 * Por qué importa: su sitemap tiene 258 URLs y ninguna es de sello-ia.com,
 * pese a que la insignia exigida para la publicación gratuita sí está en
 * nuestro layout desde hace días.
 */

const CANDIDATAS = [
  "https://queia.es/publicar",
  "https://queia.es/publicar-herramienta",
  "https://queia.es/herramientas/publicar",
  "https://queia.es/panel/publicar",
];

/** El enlace real de "Publicar Herramienta" está en la portada. */
async function enlacePublicarDePortada() {
  try {
    const r = await fetch("https://queia.es", { headers: { "User-Agent": "Mozilla/5.0" } });
    const t = await r.text();
    const hrefs = [...new Set([...t.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]))];
    const pub = hrefs.filter((h) => /public|enviar|submit|nueva/i.test(h));
    console.log(`  enlaces "publicar" en portada: ${pub.join(" | ") || "ninguno"}`);

    // El texto del botón existe en HTML (lo indexan los buscadores): si está,
    // el href tiene que estar justo al lado.
    for (const texto of [/Enviar\s+Nueva\s+Herramienta/i, /Quieres\s+que\s+tu\s+Herramienta/i, /Publicar\s+Herramienta/i]) {
      const i = t.search(texto);
      if (i >= 0) {
        const ctx = t.slice(Math.max(0, i - 400), i + 120).replace(/\s+/g, " ");
        const href = ctx.match(/href=["']([^"']+)["']/i);
        console.log(`  contexto "${texto.source.slice(0, 24)}…" → href: ${href ? href[1] : "ninguno en el contexto"}`);
        if (href && !pub.includes(href[1])) pub.push(href[1]);
      }
    }
    return pub;
  } catch (e) {
    console.log(`  portada → ${e.message}`);
    return [];
  }
}

(async () => {
  const enlaces = await enlacePublicarDePortada();

  for (const u of [...CANDIDATAS, ...enlaces.filter((h) => h.startsWith("http") || h.startsWith("/"))]) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
      console.log(`  ${u} → ${r.status} · ${r.url}`);
      if (!r.ok) continue;
      const t = await r.text();

      for (const f of t.match(/<form[^>]*>/gi) ?? []) console.log(`    FORM: ${f.slice(0, 220)}`);
      for (const i of (t.match(/<input[^>]*>/gi) ?? []).slice(0, 20)) {
        const name = i.match(/name=["']([^"']+)["']/i)?.[1];
        if (name) console.log(`    INPUT: ${name}`);
      }
      for (const s of (t.match(/<select[^>]*>/gi) ?? [])) {
        const name = s.match(/name=["']([^"']+)["']/i)?.[1];
        if (name) console.log(`    SELECT: ${name}`);
      }
      for (const b of (t.match(/<button[^>]*>/gi) ?? [])) {
        const name = b.match(/name=["']([^"']+)["']/i)?.[1];
        if (name) console.log(`    BUTTON: ${name}`);
      }
      const apis = [...new Set(t.match(/\/api\/[a-z0-9/_-]+/gi) ?? [])];
      console.log(`    APIS: ${apis.slice(0, 10).join(", ")}`);
      break;
    } catch (e) {
      console.log(`  ${u} → ${e.message}`);
    }
  }
})();
