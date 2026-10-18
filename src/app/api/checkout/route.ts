import { NextRequest } from "next/server";
import {
  PLANES,
  StripeError,
  crearCheckout,
  esPlanValido,
  modoTest,
} from "@/lib/stripe";

export const maxDuration = 20;

const ORIGEN =
  process.env.NEXT_PUBLIC_SITIO?.replace(/\/$/, "") ?? "https://sello-ia.com";

/**
 * POST /api/checkout
 * Body: { plan: "pro" | "auditoria" | "agencias", email?: string }
 *
 * Devuelve la URL de Stripe Checkout y redirige allí.
 */
export async function POST(req: NextRequest) {
  let planId: unknown;
  let email: string | undefined;

  try {
    const cuerpo = await req.json();
    planId = cuerpo?.plan;
    if (typeof cuerpo?.email === "string") email = cuerpo.email.slice(0, 254);
  } catch {
    return Response.json({ error: "peticion" }, { status: 400 });
  }

  if (!esPlanValido(planId)) {
    return Response.json(
      { error: "plan", mensaje: "Ese plan no existe." },
      { status: 400 }
    );
  }

  const plan = PLANES[planId];

  try {
    const sesion = await crearCheckout({
      plan,
      origen: ORIGEN,
      email: email || undefined,
      modo: plan.modo,
      referencia: req.headers.get("x-selloia-ref") ?? undefined,
    });

    return Response.json({
      url: sesion.url,
      id: sesion.id,
      modoPrueba: modoTest(),
    });
  } catch (e) {
    if (e instanceof StripeError) {
      console.error("[checkout] Stripe:", e.status, e.tipo, e.codigo, e.message);
      // No filtramos el mensaje crudo de Stripe al cliente salvo 429.
      const esAltaDemanda = e.status === 429;
      return Response.json(
        {
          error: "stripe",
          mensaje: esAltaDemanda
            ? "Stripe está saturado en este momento. Inténtalo en un minuto."
            : "No hemos podido iniciar el pago. Inténtalo de nuevo o escríbenos.",
        },
        { status: esAltaDemanda ? 503 : 502 }
      );
    }
    console.error("[checkout] inesperado:", e);
    return Response.json(
      { error: "servidor", mensaje: "Error inesperado al iniciar el pago." },
      { status: 500 }
    );
  }
}