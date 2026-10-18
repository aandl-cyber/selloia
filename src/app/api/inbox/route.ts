import { NextRequest } from "next/server";
import { registrar, normalizarEntrante } from "@/lib/inbox";

/**
 * POST /api/inbox
 * Webhook de entrada de Resend.
 *
 * Configurado en resend.com → Inbound → destino: esta URL.
 * Secured con `secret` (el que eligas al crear la ruta en Resend).
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const secreto = process.env.INBOX_SECRET;

  if (secreto && url.searchParams.get("secret") !== secreto) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return Response.json({ error: "json invalido" }, { status: 400 });
  }

  const mensaje = normalizarEntrante(cuerpo);
  if (!mensaje) {
    return Response.json({ error: "payload incompleto" }, { status: 400 });
  }

  try {
    const issue = await registrar(mensaje);
    console.log(`[inbox] "${mensaje.subject}" de ${mensaje.from} -> issue #${issue.numero}`);
    return Response.json({ ok: true, issue: issue.numero }, { status: 201 });
  } catch (e) {
    console.error("[inbox] no se pudo registrar:", e);
    // 500 para que Resend reintente: perder un email de cliente es peor que
    // devolver un error y que lo vuelva a intentar.
    return Response.json({ error: "almacen" }, { status: 500 });
  }
}

/** GET /api/inbox?secret=... — lista lo pendiente de responder. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secreto = process.env.INBOX_SECRET;
  if (secreto && url.searchParams.get("secret") !== secreto) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  try {
    const { listarPendientes } = await import("@/lib/inbox");
    return Response.json({ pendientes: await listarPendientes() });
  } catch (e) {
    return Response.json({ error: "lectura", detalle: String(e) }, { status: 500 });
  }
}