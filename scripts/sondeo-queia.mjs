/**
 * Última búsqueda del formulario de publicación de queia.es: rutas candidatas
 * razonables y las rutas embebidas en el payload de Next.js (self.__next_f),
 * que es donde un enlace de navegación renderizado en cliente deja su URL.
 *
 * Se agota aquí: la insignia que exigen para publicar gratis sí está en
 * nuestro layout, así que si su revisión manual sigue en cola, es su cola.
 */

const CANDIDATAS = [
  "/enviar",
  "/enviar-herramienta",
  "/herramienta/nueva",
  "/herramientas/nueva",
  "/nueva-herramienta",
  "/sumar",
  "/alta",
  "/submit",
  "/herramientas/submit",
];

(async () => {
  const r = await fetch("https://queia.es", { headers: { "User-Agent": "Mozilla/5.0" } });
  const t = await r.text();

  // Rutas del payload de Next.
  const rutas = [...new Set([...t.matchAll(/["'](\/[a-z0-9/_-]{3,60})["']/gi)].map((m) => m[1]))];
  const sospechosas = rutas.filter((x) => /envi|public|nuev|sum|alta|herramienta/i.test(x));
  console.log(`  rutas del payload: ${sospechosas.join(" | ") || "ninguna"}`);

  const urls = [...new Set([...CANDIDATAS, ...sospechosas])];
  for (const p of urls) {
    try {
      const rr = await fetch("https://queia.es" + p, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "manual" });
      const ok = rr.status === 200;
      if (ok || rr.status === 307 || rr.status === 308) {
        console.log(`  ${p} → ${rr.status}${rr.status !== 200 ? " → " + (rr.headers.get("location") ?? "?") : ""}`);
        if (ok) {
          const html = await rr.text();
          const form = (html.match(/<form[^>]*>/gi) ?? [])[0];
          if (form) console.log(`    FORM: ${form.slice(0, 200)}`);
        }
      }
    } catch {
      /* una ruta que falla no rompe el sondeo */
    }
  }
  console.log("  (solo se muestra lo que no es 404)");
})();
