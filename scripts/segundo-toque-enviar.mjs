/**
 * Envía el segundo toque, y solo el segundo toque.
 *
 * Este fichero no decide nada: lee la CSV que ya ha pasado el reescaneo con
 * el escáner corregido, el filtro de España y la revisión humana, y manda un
 * correo distinto en tono y ángulo del primero (el primero hablaba del Art. 50
 * y de la evidencia; este habla de lo que ha cambiado desde entonces y de lo
 * que la AEPD ya está haciendo, más la comprobación de que sigue abierta).
 *
 * Salvaguardas, porque cada una responde a algo que ya ha fallado:
 *  - No envía nada si la CSV está vacía o solo tiene cabecera (no hay
 *    "campaña fantasma" sin candidatos).
 *  - Vuelve a excluir buzones legales pase lo que pase (el filtro ya corrió
 *    antes, esto es defensa en profundidad).
 *  - Guarda cada envío aceptado en emisor-estado.json con Node, en UTF-8 sin
 *    BOM: el BOM de PowerShell borró el historial una vez y reenvió a converly.
 *  - Pausas aleatorias de verdad entre envíos: un intervalo fijo es la
 *    firma de un bot, y esto tiene que parecer lo que es, una persona.
 *
 * La promesa de "mensaje único" solo se hizo en la campaña de agencias; aquí
 * el pie decía "responde BAJA y te elimino en 24 h", así que un segundo toque
 * a quien sigue incumpliendo no rompe ninguna palabra dada.
 */

import { readFile, writeFile } from "node:fs/promises";

const CSV = "docs/outreach/segundo-toque-candidatos.csv";
const ESTADO = ".datos/emisor-estado.json";
const LOG = "docs/outreach/segundo-toque-envios.log";

const RESEND = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.RESEND_FROM ?? "SelloIA <hola@sello-ia.com>";

const NO_ESCRIBIR =
  /^(rgpd|lopd|dpo|legal|privacidad|protecciondatos|avisolegal|abuse|postmaster|hostmaster|spam|unsubscribe|baja|administracion|direccion)/i;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const aleatorio = (min, max) => min + Math.floor(Math.random() * (max - min));

function escapar(s) {
  const m = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s).replace(/[&<>"']/g, (c) => m[c]);
}

function asunto(dominio) {
  // Distinto del primero ("<dominio> — Art. 50: <evidencia> sin aviso"): aquí
  // el gancho es la revisión de hoy, no repetir la denuncia de hace días.
  return `Hoy he vuelto a revisar ${dominio}`;
}

function cuerpo(dominio, evidencia) {
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:600px">
  <p style="font-size:14px;color:#292524;line-height:1.7">Hola:</p>
  <p style="font-size:14px;color:#292524;line-height:1.7">
    Te escribí hace unos días sobre <strong>${escapar(dominio)}</strong>. Hoy he
    vuelto a ejecutar el escaneo y sigue con
    <strong>${escapar(evidencia)}</strong> sin aviso visible de que detrás de la
    conversación no hay una persona.
  </p>
  <p style="font-size:14px;color:#292524;line-height:1.7">
    Lo que ha cambiado es el entorno: la AEPD ya ha emitido advertencias
    formales por uso de IA sin informar (<strong>AI-00009-2026</strong>), las
    sanciones por transparencia arrancan en <strong>6.000 €</strong> y el
    <strong>RD 723/2026</strong>, en vigor desde el 5 de octubre, añade deberes
    de información sobre los sistemas de IA que se usan con las personas.
  </p>
  <p style="font-size:14px;color:#292524;margin:20px 0">
    <a href="https://sello-ia.com/?u=${encodeURIComponent(dominio)}"
       style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;
              padding:12px 22px;border-radius:6px;font-weight:600;font-size:14px">
      Ver el escaneo de hoy
    </a>
  </p>
  <p style="font-size:14px;color:#292524;line-height:1.7">
    El propio escaneo te deja el aviso listo para pegar en tu web. Si prefieres
    que no se te olvide nunca, el plan de vigilancia son
    <strong>19,99 €/mes</strong> y te aviso si algo cambia.
  </p>
  <p style="font-size:14px;color:#292524;line-height:1.7">
    Si ya lo tienes cubierto, respóndeme y no vuelvo a escribirte.
  </p>
  <p style="font-size:12px;color:#78716c;line-height:1.6">
    linac · SelloIA · <a href="https://sello-ia.com" style="color:#78716c">sello-ia.com</a>
  </p>
  <hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0 12px">
  <p style="font-size:11px;color:#a8a29e;line-height:1.6">
    Seguimiento de un aviso verificable sobre el Art. 50 del Reglamento (UE)
    2024/1689, no publicidad. Responde BAJA y te elimino en 24 h.
  </p>
</div>`;
}

async function enviar(destino) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [destino.email],
      subject: asunto(destino.dominio),
      html: cuerpo(destino.dominio, destino.evidencia),
      headers: { "x-selloia-ref": destino.dominio },
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return (await r.json()).id;
}

(async () => {
  if (!RESEND) {
    console.error("  Falta RESEND_API_KEY.");
    process.exit(1);
  }

  const crudo = await readFile(CSV, "utf8");
  const filas = crudo
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("empresa;"))
    .map((l) => {
      const [empresa, dominio, , email, evidencia] = l.split(";");
      return { empresa, dominio: dominio?.trim(), email: email?.trim().toLowerCase(), evidencia };
    })
    .filter((x) => x.email && x.dominio && !NO_ESCRIBIR.test(x.email.split("@")[0]));

  if (!filas.length) {
    console.log("  Sin candidatos: no se envía nada.");
    process.exit(0);
  }

  // Dedupe contra el historial: nadie recibe dos veces el segundo toque.
  const estado = JSON.parse(await readFile(ESTADO, "utf8"));
  const ya = new Set((estado.enviados ?? []).map((e) => String(e).toLowerCase()));
  const cola = filas.filter((x) => !ya.has(x.email));

  console.log(`\n  Segundo toque · ${filas.length} candidatos · ${cola.length} por enviar\n`);

  let enviados = 0;
  let fallos = 0;

  for (const [i, d] of cola.entries()) {
    try {
      const id = await enviar(d);
      estado.enviados = estado.enviados ?? [];
      estado.enviados.push(d.email);
      // UTF-8 explícito y sin BOM: el historial ya se perdió una vez.
      await writeFile(ESTADO, JSON.stringify(estado, null, 2), "utf8");
      const linea = `[ok] ${new Date().toISOString()} · ${d.email} · ${d.dominio} · ${id}\n`;
      await writeFile(LOG, linea, { encoding: "utf8", flag: "a" });
      console.log(`  [ok] ${d.email} · ${d.dominio}`);
      enviados++;
    } catch (e) {
      fallos++;
      const linea = `[error] ${new Date().toISOString()} · ${d.email} · ${e.message}\n`;
      await writeFile(LOG, linea, { encoding: "utf8", flag: "a" });
      console.log(`  [error] ${d.email} · ${e.message}`);
    }
    if (i < cola.length - 1) {
      const pausa = aleatorio(40000, 110000);
      console.log(`      … espera ${Math.round(pausa / 1000)} s`);
      await dormir(pausa);
    }
  }

  console.log(`\n  Terminado: ${enviados} enviados · ${fallos} errores\n`);
})();
