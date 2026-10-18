/**
 * Envío de emails transaccionales vía Resend.
 *
 * Estado actual del dominio: `sello-ia.com` AÚN NO está verificado en Resend.
 * Mientras tanto Resend solo permite enviar desde `onboarding@resend.dev`
 * y únicamente a la dirección titular de la cuenta (403 en cualquier otro caso).
 *
 * `enviar()` degrada con elegancia: si el remitente propio falla por dominio no
 * verificado, cae al remitente de pruebas para que el flujo nunca se rompa.
 */

const API = "https://api.resend.com/emails";

export type Remitente = "propio" | "respaldo";

export interface ResultadoEnvio {
  ok: boolean;
  id?: string;
  motivo?: string;
  usadoRespaldo?: boolean;
}

function remitentePropio(): string {
  return process.env.RESEND_FROM ?? "SelloIA <hola@sello-ia.com>";
}
function remitenteRespaldo(): string {
  return "SelloIA <onboarding@resend.dev>";
}

function htmlBase(interior: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#fafaf9;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden">
    <div style="padding:20px 24px;border-bottom:1px solid #e7e5e4">
      <span style="display:inline-block;background:#1c1917;color:#fff;font-weight:700;padding:3px 8px;border-radius:5px;font-size:13px">S</span>
      <span style="font-weight:600;color:#1c1917;font-size:15px;margin-left:8px">SelloIA</span>
    </div>
    <div style="padding:24px;color:#292524;font-size:14px;line-height:1.65">${interior}</div>
    <div style="padding:14px 24px;background:#f5f5f4;border-top:1px solid #e7e5e4;font-size:11px;color:#78716c">
      SelloIA · Herramienta técnica de verificación del Art. 50 del Reglamento (UE) 2024/1689.
      <strong>No constituye asesoramiento jurídico.</strong> ·
      <a href="/privacidad" style="color:#78716c">Privacidad</a> ·
      <a href="/aviso-legal" style="color:#78716c">Aviso legal</a>
    </div>
  </div>
</body></html>`;
}

async function post(datos: Record<string, unknown>): Promise<{ id?: string; mensaje?: string; status: number }> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) return { status: 0, mensaje: "RESEND_API_KEY no configurado" };

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify(datos),
      cache: "no-store",
    });
    const texto = await res.text();
    let json: { id?: string; message?: string } = {};
    try {
      json = JSON.parse(texto);
    } catch {
      /* respuesta no-JSON */
    }
    return { status: res.status, id: json.id, mensaje: json.message };
  } catch (e) {
    return { status: 0, mensaje: e instanceof Error ? e.message : "fallo de red" };
  }
}

export async function enviar(opts: {
  para: string;
  asunto: string;
  html: string;
  remitente?: Remitente;
}): Promise<ResultadoEnvio> {
  const from = opts.remitente === "respaldo" ? remitenteRespaldo() : remitentePropio();

  const r = await post({
    from,
    to: [opts.para],
    subject: opts.asunto,
    html: opts.html,
  });

  if (r.status >= 200 && r.status < 300) {
    return { ok: true, id: r.id, usadoRespaldo: from !== remitentePropio() };
  }

  // 403 = dominio propio sin verificar en Resend. Reintentamos una sola vez.
  if (r.status === 403 && opts.remitente !== "respaldo") {
    const r2 = await post({
      from: remitenteRespaldo(),
      to: [opts.para],
      subject: opts.asunto,
      html: opts.html,
    });
    if (r2.status >= 200 && r2.status < 300) {
      return { ok: true, id: r2.id, usadoRespaldo: true };
    }
    return { ok: false, motivo: r2.mensaje ?? `HTTP ${r2.status}` };
  }

  return { ok: false, motivo: r.mensaje ?? `HTTP ${r.status}` };
}

// ── Plantillas ──────────────────────────────────────────────────────────────

export function emailBienvenida(opts: {
  nombre?: string;
  plan: string;
  dominio?: string;
}): { asunto: string; html: string } {
  const hola = opts.nombre ? `Hola ${opts.nombre},` : "Hola,";
  const escaneo = opts.dominio
    ? `<p>Ya estamos escaneando <strong>${opts.dominio}</strong>. Te escribimos en cuanto tengamos el informe.</p>`
    : `<p>Pásanos la dirección de tu web y empezamos el escaneo.</p>`;

  return {
    asunto: "Tu compra en SelloIA está confirmada",
    html: htmlBase(`
      <h1 style="font-size:20px;margin:0 0 12px;color:#1c1917">${hola}</h1>
      <p>Tu pago de <strong>${opts.plan}</strong> se ha recibido correctamente. A partir de aquí el trabajo es nuestro.</p>

      <div style="background:#f5f5f4;border-radius:8px;padding:16px;margin:20px 0">
        <p style="margin:0 0 6px"><strong>Qué pasa ahora</strong></p>
        <p style="margin:0">${escaneo}</p>
      </div>

      <p><strong>Esto es lo que aún tienes que hacer — nada:</strong></p>
      <ol style="padding-left:20px;margin:8px 0">
        <li style="margin-bottom:6px">Recibes el informe completo con los textos ya redactados en español.</li>
        <li style="margin-bottom:6px">Coplas y pegas. Tarda unos 5 minutos.</li>
        <li style="margin-bottom:6px">Revisamos tu web cada 30 días y te avisamos si algo se rompe.</li>
      </ol>

      <p>Si tienes cualquier duda, responde a este email. Contestamos en menos de 4 horas laborables.</p>
    `),
  };
}

export function emailAlertaCambio(opts: {
  dominio: string;
  score: number;
  criticos: number;
  que: string;
}): { asunto: string; html: string } {
  const tono = opts.criticos > 0 ? "#b42318" : "#a16207";
  return {
    asunto: `${opts.dominio}: ha cambiado tu cumplimiento del Art. 50`,
    html: htmlBase(`
      <h1 style="font-size:20px;margin:0 0 12px;color:#1c1917">Tu web ha cambiado</h1>
      <p>Detectamos un cambio en <strong>${opts.dominio}</strong> en la revisión automática de hoy.</p>

      <div style="border-left:3px solid ${tono};padding:10px 14px;background:#fafaf9;border-radius:0 6px 6px 0;margin:18px 0">
        <p style="margin:0"><strong>${opts.que}</strong></p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:16px 0">
        <tr><td style="padding:6px 0;color:#78716c">Puntuación anterior</td><td style="text-align:right;font-weight:600">—</td></tr>
        <tr><td style="padding:6px 0;color:#78716c">Puntuación actual</td><td style="text-align:right;font-weight:700;color:${tono}">${opts.score}/100</td></tr>
        <tr><td style="padding:6px 0;color:#78716c">Incidencias críticas</td><td style="text-align:right;font-weight:700;color:${tono}">${opts.criticos}</td></tr>
      </table>

      <p><a href="/" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600">Ver el detalle</a></p>
    `),
  };
}