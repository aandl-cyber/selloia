/**
 * Toma una dirección de prueba de mail-tester.com y envía ahí una copia del
 * email real de campaña para medir la entregabilidad de forma objetiva.
 *
 * Por qué existe: 82 emails entregados y 0 respuestas puede ser mala suerte,
 * lista mala o que todo cae en spam. La tercera opción es la única que arregla
 * el producto y no la campaña, y mail-tester la mide con una puntuación.
 */
import { readFile } from "node:fs/promises";

const RESEND = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.RESEND_FROM ?? "SelloIA <hola@sello-ia.com>";

async function direccionDePrueba() {
  const r = await fetch("https://mail-tester.com", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0)" },
  });
  const html = await r.text();
  const m = html.match(/[a-z0-9]{8,14}@srv[0-9]*\.mail-tester\.com/i);
  if (!m) throw new Error("mail-tester no devolvio direccion en la portada");
  return m[0];
}

async function puntuacion(dir) {
  // La pagina de resultados tarda en reflejar el email; se reintenta.
  const slug = dir.split("@")[0];
  for (let i = 0; i < 10; i++) {
    await new Promise((res) => setTimeout(res, 15000));
    const r = await fetch(`https://mail-tester.com/${slug}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0)" },
    });
    const html = await r.text();
    const m = html.match(/Your score is:?\s*<[^>]*>\s*([0-9.,]+)|score[^0-9]{0,40}([0-9][0-9.,]*)/i);
    const numero = m && (m[1] ?? m[2]);
    if (numero) return { score: numero, intento: i + 1 };
  }
  return { score: null, intento: 10 };
}

(async () => {
  if (!RESEND) {
    console.error("  Falta RESEND_API_KEY.");
    process.exit(1);
  }

  const dir = await direccionDePrueba();
  console.log(`\n  Direccion de prueba: ${dir}\n`);

  // Se coge el email de campana real, tal cual lo reciben las agencias.
  const src = await readFile("scripts/campana-agencias.mjs", "utf8");
  const cuerpoFn = new Function(
    src.match(/function pie\(remitente\)[\s\S]*?\n}/)[0] +
      src.match(/function asunto\(\)[\s\S]*?\n}/)[0] +
      src.match(/function cuerpo\(dominio, remitente\)[\s\S]*?\n}/)[0] +
      "; return { asunto, cuerpo };"
  )();

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [dir],
      subject: cuerpoFn.asunto(),
      html: cuerpoFn.cuerpo("ejemplo.es", dir),
    }),
  });

  if (!r.ok) {
    console.error(`  Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    process.exit(1);
  }
  const id = (await r.json()).id;
  console.log(`  Email enviado · id ${id}`);

  const { score, intento } = await puntuacion(dir);
  console.log(`\n  PUNTUACION: ${score ?? "no disponible"} (tras ${intento} intentos)`);
  console.log(`  Resultado: https://mail-tester.com/${dir.split("@")[0]}\n`);
})();
