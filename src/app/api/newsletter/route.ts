import { NextRequest } from "next/server";
import { validarUrl } from "@/lib/scanner/url-guard";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/newsletter
 *
 * Alta en la lista de vigilancia + newsletter "Cumplimiento Digital".
 * Si RESEND_API_KEY no está configurado, responde 200 igualmente:
 * nunca debe romper la conversión por un fallo de email.
 */
export async function POST(req: NextRequest) {
  let email = "";
  let url = "";

  try {
    const cuerpo = await req.json();
    email = String(cuerpo?.email ?? "").trim().slice(0, 254);
    url = String(cuerpo?.url ?? "").trim().slice(0, 2048);
  } catch {
    return Response.json({ error: "peticion" }, { status: 400 });
  }

  if (!EMAIL.test(email)) {
    return Response.json({ error: "email", mensaje: "Ese email no parece válido." }, { status: 400 });
  }

  let dominio = "";
  try {
    if (url) dominio = validarUrl(url).hostname;
  } catch {
    dominio = "";
  }

  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey) {
    console.warn("[newsletter] RESEND_API_KEY no configurado; alta no enviada.", {
      email,
      dominio,
    });
    return Response.json({ ok: true, pendiente: true });
  }

  try {
    if (audienceId) {
      await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          unsubscribed: false,
          first_name: "",
        }),
      });
    }

    const remitente = process.env.RESEND_FROM ?? "SelloIA <hola@selloia.es>";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remitente,
        to: [email],
        subject: "Vigilamos tu web",
        html: `<div style="font-family:system-ui,sans-serif;max-width:520px">
  <h1 style="font-size:20px;margin:0 0 12px">Ya estamos vigilando ${dominio || "tu web"}</h1>
  <p style="color:#444;line-height:1.6">Cada 30 días comprobamos que los avisos de IA siguen visibles y que no has montado ningún sistema nuevo sin declarar.</p>
  <p style="color:#444;line-height:1.6">Si algo cambia, te escribimos. Si no, no te molestamos.</p>
  <p style="color:#888;font-size:12px;margin-top:24px">
    SelloIA · <a href="/privacidad" style="color:#888">Privacidad</a> · puedes darte de baja en cualquier email.
  </p>
</div>`,
      }),
    });
  } catch (e) {
    console.error("[newsletter] fallo al enviar:", e);
  }

  return Response.json({ ok: true });
}