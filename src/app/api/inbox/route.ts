import { NextRequest } from "next/server";
import { registrar, normalizarEntrante, verificarFirmaResend } from "@/lib/inbox";

/**
 * POST /api/inbox
 * Webhook de entrada de Resend.
 *
 * Seguridad en dos capas:
 *  1. Firma Svix (svix-id / svix-timestamp / svix-signature). Es la real.
 *  2. Token `?secret=` como red de seguridad mientras no haya firma.
 *
 * Una capa no sustituye a la otra: la firma evita que alguien con la URL se
 * cuele, y el token evita que un cambio de configuracion deje el buzon abierto.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const tokenUrl = url.searchParams.get("secret");
  const secretoUrl = process.env.INBOX_SECRET;

  const cuerpo = await req.text();

  // Capa 1: firma criptografica de Resend.
  let firmado = false;
  if (process.env.RESEND_WEBHOOK_SECRET) {
    firmado = await verificarFirmaResend(cuerpo, {
      svixId: req.headers.get("svix-id"),
      svixTimestamp: req.headers.get("svix-timestamp"),
      svixSignature: req.headers.get("svix-signature"),
    });
    if (!firmado) {
      console.warn("[inbox] firma Svix invalida; webhook descartado.");
      return Response.json({ error: "firma_invalida" }, { status: 400 });
    }
  }

  // Capa 2: token en la URL.
  if (!firmado) {
    if (!secretoUrl || tokenUrl !== secretoUrl) {
      return Response.json({ error: "no autorizado" }, { status: 401 });
    }
  }

  let json: unknown;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    return Response.json({ error: "json invalido" }, { status: 400 });
  }

  // El payload de Resend llega envuelto en { from, to, ... } o en { type, data }.
  // Aceptamos ambas formas para no depender del formato exacto.
  const base =
    json && typeof json === "object" && "data" in (json as Record<string, unknown>)
      ? ((json as Record<string, unknown>).data as Record<string, unknown>)
      : (json as Record<string, unknown>);

  const mensaje = normalizarEntrante(base);
  if (!mensaje) {
    return Response.json({ error: "payload incompleto" }, { status: 400 });
  }

  try {
    const issue = await registrar(mensaje);
    console.log(`[inbox] "${mensaje.subject}" de ${mensaje.from} -> issue #${issue.numero}`);

    // Aviso al administrador: así no hay que ir a mirar el repositorio.
    const aviso = process.env.ADMIN_EMAIL;
    if (aviso) {
      const { notificarEntrada } = await import("@/lib/email");
      await notificarEntrada({
        para: aviso,
        remitente: mensaje.from,
        asunto: mensaje.subject,
        preview: (mensaje.text ?? "").replace(/\s+/g, " ").trim().slice(0, 320),
        issue: issue.numero,
      });
    }

    return Response.json({ ok: true, issue: issue.numero }, { status: 201 });
  } catch (e) {
    console.error("[inbox] no se pudo registrar:", e);
    return Response.json({ error: "almacen" }, { status: 500 });
  }
}

/** GET /api/inbox?secret=... — lista lo pendiente de responder. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secreto = process.env.INBOX_SECRET;
  if (!secreto || url.searchParams.get("secret") !== secreto) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  try {
    const { listarPendientes } = await import("@/lib/inbox");
    return Response.json({ pendientes: await listarPendientes() });
  } catch (e) {
    return Response.json({ error: "lectura", detalle: String(e) }, { status: 500 });
  }
}