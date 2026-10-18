import { NextRequest } from "next/server";
import { verificarFirmaWebhook } from "@/lib/stripe";
import { emailBienvenida, enviar } from "@/lib/email";

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
      const detalles = (objeto.customer_details ?? {}) as { email?: string; name?: string };
      const plan = String(meta.plan ?? "?");
      const email = String(objeto.customer_email ?? detalles.email ?? "");
      const modo = String(objeto.mode ?? "?");
      console.log(`[webhook] pago completado ${id} · plan=${plan} · modo=${modo} · ${email || "sin email"}`);

      // Bienvenida: solo si Stripe nos ha dado un email al que escribir.
      if (email.includes("@")) {
        const nombre = (detalles.name ?? "").split(" ")[0] || undefined;
        const t = emailBienvenida({ nombre, plan: plan.toUpperCase() });
        const r = await enviar({ para: email, asunto: t.asunto, html: t.html });
        if (r.ok) {
          console.log(`[webhook] bienvenida enviada a ${email}${r.usadoRespaldo ? " (remitente de respaldo)" : ""}`);
        } else {
          // Nunca fallamos el webhook por un email: Stripe reintenta y
          // el cliente ya ha pagado.
          console.error(`[webhook] no se pudo enviar la bienvenida a ${email}: ${r.motivo}`);
        }
      }
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