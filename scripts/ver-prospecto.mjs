/**
 * Muestra el detalle completo de un escaneo: qué detectó, con qué evidencia y
 * qué dice cada hallazgo. Existe para poder responder a una pregunta
 * concreta y delicada: ¿es honesto decirle a esta web "tienes IA sin aviso"?
 *
 * Las agencias de IA suelen mencionar herramientas en su propia web ("usamos
 * Claude"), y eso no es un chatbot hablando con el visitante. Escribe algo así
 * a un tercero y no es marketing: es mentirle sobre su negocio.
 */

const API = "https://sello-ia.com/api/scan";
const CLAVE = process.env.SCAN_API_KEY ?? "sk-interno-selloia-prospeccion-2026";
const dominio = process.argv[2] ?? "aiagencies.eu";

(async () => {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-selloia-key": CLAVE },
    body: JSON.stringify({ url: `https://${dominio}` }),
  });
  const txt = await r.text();
  console.log(`  HTTP ${r.status} · ${txt.length} chars`);

  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    console.log(`  respuesta no JSON: ${txt.slice(0, 300)}`);
    process.exit(1);
  }

  if (!data.resultado) {
    if (data.error === "demasiados") {
      console.log("  rate limit: se omite el escaneo y solo se hace la prueba de honestidad");
    } else {
      console.log(`  sin resultado: ${txt.slice(0, 300)}`);
      process.exit(1);
    }
  }

  const res = data.resultado;
  if (res) {
    console.log(`  score ${res.score} · nivel ${res.nivel} · estado ${res.estado}`);
    console.log("");
    console.log(`  RESUMEN: ${res.resumen}`);
    console.log("");

    console.log(`  DETECCIONES (${res.detecciones?.length ?? 0}):`);
    for (const d of res.detecciones ?? []) {
      console.log(`    · ${d.proveedor} (${d.tipo ?? d.categoria ?? "sin tipo"})`);
      for (const [k, v] of Object.entries(d)) {
        if (k === "proveedor" || k === "tipo" || k === "categoria") continue;
        console.log(`        ${k}: ${JSON.stringify(v).slice(0, 220)}`);
      }
    }
    console.log("");

    console.log(`  HALLAZGOS (${res.hallazgos?.length ?? 0}):`);
    for (const h of res.hallazgos ?? []) {
      console.log(`    [${h.severity}] ${h.articulo} · ${h.titulo}`);
      const detalle = h.detalle ?? h.descripcion ?? h.explicacion;
      if (detalle) console.log(`       ${String(detalle).slice(0, 200)}`);
      if (h.evidencia) console.log(`       evidencia: ${JSON.stringify(h.evidencia).slice(0, 220)}`);
      if (h.url) console.log(`       url: ${h.url}`);
    }
  }

  // ── Prueba de honestidad ────────────────────────────────────────────────
  // El escáner solo casaba con claude.ai/perplexity.ai por URL de script o
  // identificador fuera de cadenas. Aun así se comprueba en el HTML crudo si
  // hay una etiqueta <script src> de verdad: si solo es un enlace o texto
  // ("usamos Claude"), escribir "tu web genera contenido con IA sin marcado"
  // sería mentirle a alguien sobre su negocio.
  console.log("");
  console.log("  PRUEBA DE HONESTIDAD (HTML crudo):");
  try {
    const hr = await fetch(`https://${dominio}/`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0)" },
    });
    const html = await hr.text();
    const srcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
    const conIa = srcs.filter((s) => /claude\.ai|perplexity\.ai|anthropic/i.test(s));
    console.log(`    scripts totales: ${srcs.length}`);
    console.log(
      `    <script src> de IA: ${conIa.length ? conIa.join(" · ") : "NINGUNO"}`
    );
    const nC = (html.match(/claude\.ai/gi) || []).length;
    const nP = (html.match(/perplexity\.ai/gi) || []).length;
    console.log(`    menciones crudas: claude.ai=${nC} · perplexity.ai=${nP}`);
    const i = html.search(/claude\.ai|perplexity\.ai/i);
    if (i >= 0) {
      const ctx = html.slice(Math.max(0, i - 160), i + 110).replace(/\s+/g, " ");
      console.log(`    contexto: ...${ctx}...`);
    }
  } catch (e) {
    console.log(`    no se pudo comprobar: ${e.message}`);
  }
})();
