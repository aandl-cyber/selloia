import { NextRequest } from "next/server";
import { verificarFirmaWebhook } from "@/lib/stripe";

export const maxDuration = 20;

/**
 * POST /api/webhooks/stripe
 *
 * Recibe los eventos de Stripe. La firma se verifica SIEMPRE antes de
 * procesar nada: sin firma válida respondemos 400 y no tocamos el evento.
 */
export async function POST(req: NextRequest) {
  const cuerpo = await req.text();
  const firma = req.headers.get("stripe-signature");

  const valida = await verificarFirmaWebhook(cuerpo, firma);
  if (!valida) {
    console.warn("[webhook] firma inválida; evento descartado.");
    return Response.json({ error: "firma_invalida" }, { status: 400 });
  }

  let evento: { type?: string; id?: string; data?: { object?: Record<string, unknown> } };
  try {
    evento = JSON.parse(cuerpo);
  } catch {
    return Response.json({ error: "json" }, { status: 400 });
  }

  const objeto = (evento.data?.object ?? {}) as Record<string, unknown>;
  const id = String(evento.id ?? "desconocido");

  switch (evento.type) {
    case "checkout.session.completed": {
      const meta = (objeto.metadata ?? {}) as { plan?: string };
      const detalles = (objeto.customer_details ?? {}) as { email?: string };
      const plan = String(meta.plan ?? "?");
      const email = String(objeto.customer_email ?? detalles.email ?? "?");
      const modo = String(objeto.mode ?? "?");
      console.log(`[webhook] pago completado ${id} · plan=${plan} · modo=${modo} · ${email}`);
      // Punto de extensión: aquí se envía el email de bienvenida con Resend
      // y se da de alta la Vigilancia del dominio.
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      console.log(`[webhook] suscripción ${evento.type} ${id}`);
      break;
    }
    default:
      console.log(`[webhook] evento ignorado: ${evento.type} ${id}`);
  }

  return Response.json({ recibido: true });
}