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
    console.log(`  sin resultado: ${txt.slice(0, 300)}`);
    process.exit(1);
  }

  const res = data.resultado;
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
})();
