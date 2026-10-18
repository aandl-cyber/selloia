import { NextRequest } from "next/server";
import { responder } from "@/lib/inbox";

/**
 * POST /api/reply
 * Body: { para, asunto, cuerpo, inReplyTo?, references? }
 *
 * `cuerpo` acepta HTML simple. Envía el email con los encabezados de hilo
 * correctos para que la respuesta aparezca agrupada en el cliente de correo.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const secreto = process.env.INBOX_SECRET;
  if (secreto && url.searchParams.get("secret") !== secreto) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  let para = "";
  let asunto = "";
  let cuerpo = "";
  let inReplyTo: string | undefined;
  let references: string | undefined;

  try {
    const d = await req.json();
    para = String(d?.para ?? "").trim();
    asunto = String(d?.asunto ?? "").trim();
    cuerpo = String(d?.cuerpo ?? "");
    inReplyTo = d?.inReplyTo ? String(d.inReplyTo) : undefined;
    references = d?.references ? String(d.references) : undefined;
  } catch {
    return Response.json({ error: "json invalido" }, { status: 400 });
  }

  if (!para.includes("@")) {
    return Response.json({ error: "destinatario", mensaje: "Falta el destinatario." }, { status: 400 });
  }
  if (!cuerpo.trim()) {
    return Response.json({ error: "cuerpo", mensaje: "El mensaje está vacío." }, { status: 400 });
  }

  const html = cuerpo.trim().startsWith("<")
    ? cuerpo
    : `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#292524;line-height:1.65">
${cuerpo
  .split("\n")
  .map((l) => (l.trim() ? `<p style="margin:0 0 12px">${escapar(l)}</p>` : ""))
  .join("")}
</div>`;

  try {
    const r = await responder({
      para,
      asunto: asunto || "Re:",
      html,
      inReplyTo,
      references,
    });
    return Response.json({ ok: true, id: r.id }, { status: 201 });
  } catch (e) {
    console.error("[reply] fallo:", e);
    return Response.json(
      { error: "envio", mensaje: "No hemos podido enviar la respuesta." },
      { status: 502 }
    );
  }
}

function escapar(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}