import { NextRequest } from "next/server";
import { verificarFirmaWebhook } from "@/lib/stripe";
import { emailBienvenida, enviar } from "@/lib/email";
import { registrarDominio } from "@/lib/monitor";

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
      const meta = (objeto.metadata ?? {}) as { plan?: string; referencia?: string };
      const detalles = (objeto.customer_details ?? {}) as { email?: string; name?: string };
      const plan = String(meta.plan ?? "?");
      const email = String(objeto.customer_email ?? detalles.email ?? "");
      const modo = String(objeto.mode ?? "?");

      // El dominio que el cliente escaneó antes de pagar. Viaja como
      // `metadata.referencia` porque el botón de pago lo envía en la cabecera
      // `x-selloia-ref`. Sin esto, la vigilancia de 30 días prometida en la
      // página de gracias no arrancaría hasta que el cliente escribiera a mano.
      const referencia = String(meta.referencia ?? "").trim();
      const dominio = referencia
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .slice(0, 253);
      const esDominio = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(dominio);

      console.log(
        `[webhook] pago completado ${id} · plan=${plan} · modo=${modo} · ${email || "sin email"} · ${esDominio ? dominio : "sin dominio"}`
      );

      // Aviso al administrador. En Vercel Hobby los logs no se pueden leer, así
      // que este email es la única forma de enterarse de que ha habido una
      // venta. Sin él, el dinero entra en Stripe y nadie se entera hasta que
      // alguien pregunta.
      if (process.env.ADMIN_EMAIL?.includes("@")) {
        const planLegible = { pro: "Pro 19,99 €/mes", auditoria: "Auditoría 199 €", agencias: "Kit Agencias 499 €" }[plan] ?? plan;
        const aviso = await enviar({
          para: process.env.ADMIN_EMAIL,
          asunto: `VENTA ${planLegible}${esDominio ? ` · ${dominio}` : ""}`,
          html: `<p>Pago completado en Stripe (${modo}).</p>
<ul>
  <li>Plan: <strong>${planLegible}</strong></li>
  <li>Cliente: ${email || "sin email"}</li>
  <li>Dominio: ${esDominio ? dominio : "sin indicar"}</li>
  <li>Sesión: ${id}</li>
</ul>`,
        });
        if (!aviso.ok) console.error(`[webhook] no se pudo avisar al admin: ${aviso.motivo}`);
      }

      // Alta en la vigilancia. Solo para planes que la incluyen: el Kit
      // Agencias es marca blanca y su dominio no es el del cliente final.
      if (esDominio && email.includes("@") && (plan === "pro" || plan === "auditoria")) {
        try {
          const nuevo = await registrarDominio(dominio, email);
          console.log(`[webhook] vigilancia: ${nuevo ? "alta nueva" : "ya estaba"} · ${dominio}`);
        } catch (e) {
          // No fallamos el webhook por esto: Stripe reintenta y el cliente ya
          // ha pagado. Queda anotado y el admin recibe el aviso de venta.
          console.error(`[webhook] no se pudo registrar ${dominio}:`, e);
        }
      }

      // Bienvenida: solo si Stripe nos ha dado un email al que escribir.
      if (email.includes("@")) {
        const nombre = (detalles.name ?? "").split(" ")[0] || undefined;
        const t = emailBienvenida({
          nombre,
          plan: plan.toUpperCase(),
          dominio: esDominio ? dominio : undefined,
        });
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