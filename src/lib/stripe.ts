/**
 * Cliente de Stripe por HTTP directo.
 *
 * Por qué sin el SDK oficial:
 *  - Una dependencia menos que auditar (menor superficie de suministro).
 *  - La API de Stripe es estable y aquí solo usamos 3 endpoints.
 *  - El bundle del servidor se mantiene mínimo.
 *
 * Solo se usa la clave restringida `rk_...`, que el usuario creó con
 * permisos mínimos: Checkout Sessions, Customers y Subscriptions.
 */

const BASE = "https://api.stripe.com/v1";
const API_VERSION = "2026-08-26.dahlia";

export class StripeError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly tipo?: string,
    public readonly codigo?: string
  ) {
    super(message);
    this.name = "StripeError";
  }
}

export function claveStripe(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new StripeError("Stripe no está configurado en este entorno.", 500);
  return k;
}

export function modoTest(): boolean {
  return claveStripe().includes("_test_") || claveStripe().startsWith("rk_test_");
}

/** Codifica un objeto plano al formato de formularios que espera Stripe. */
function aFormulario(
  datos: Record<string, unknown>,
  prefix = ""
): URLSearchParams {
  const p = new URLSearchParams();
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor === undefined || valor === null) continue;
    const ruta = prefix ? `${prefix}[${clave}]` : clave;
    if (typeof valor === "object" && !Array.isArray(valor)) {
      for (const [k, v] of new URLSearchParams(aFormulario(valor as Record<string, unknown>, ruta))) {
        p.append(k, v);
      }
    } else if (Array.isArray(valor)) {
      valor.forEach((v, i) => {
        const rutaLista = `${ruta}[${i}]`;
        if (typeof v === "object" && v !== null) {
          for (const [k, val] of new URLSearchParams(aFormulario(v as Record<string, unknown>, rutaLista))) {
            p.append(k, val);
          }
        } else {
          p.append(rutaLista, String(v));
        }
      });
    } else {
      p.append(ruta, String(valor));
    }
  }
  return p;
}

export async function stripe<T = Record<string, unknown>>(
  metodo: "GET" | "POST",
  ruta: string,
  cuerpo?: Record<string, unknown>
): Promise<T> {
  const init: RequestInit = {
    method: metodo,
    headers: {
      Authorization: `Bearer ${claveStripe()}`,
      "Stripe-Version": API_VERSION,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    cache: "no-store",
  };
  if (cuerpo) init.body = aFormulario(cuerpo).toString();

  const res = await fetch(`${BASE}${ruta}`, init);

  const texto = await res.text();
  let datos: Record<string, unknown>;
  try {
    datos = JSON.parse(texto);
  } catch {
    throw new StripeError("Respuesta ilegible de Stripe.", res.status);
  }

  if (!res.ok) {
    const err = (datos.error ?? {}) as { message?: string; type?: string; code?: string };
    throw new StripeError(
      err.message ?? `Error ${res.status} de Stripe.`,
      res.status,
      err.type,
      err.code
    );
  }

  return datos as T;
}

// ── Catálogo ────────────────────────────────────────────────────────────────

export type PlanId = "pro" | "auditoria" | "agencias";

export interface Plan {
  id: PlanId;
  nombre: string;
  /** Importe en céntimos. */
  cantidad: number;
  modo: "subscription" | "payment";
  intervalo?: "month" | "year";
  descripcion: string;
}

export const PLANES: Record<PlanId, Plan> = {
  pro: {
    id: "pro",
    nombre: "SelloIA Pro",
    cantidad: 1999,
    modo: "subscription",
    intervalo: "month",
    descripcion:
      "Reescaneo automático cada 30 días, alertas si el aviso de IA desaparece, SelloIA verificable y widget listo.",
  },
  auditoria: {
    id: "auditoria",
    nombre: "Auditoría de cumplimiento",
    cantidad: 19900,
    modo: "payment",
    descripcion:
      "Informe firmado y exportable, instalación de los avisos por nosotros, revisión de tu política interna y 12 meses de SelloIA Pro.",
  },
  agencias: {
    id: "agencias",
    nombre: "Kit Agencias",
    cantidad: 49900,
    modo: "payment",
    descripcion:
      "SelloIA en tu marca, informe vendible por cliente, kit de formación Art. 4 y 26, textos legales reutilizables y soporte prioritario.",
  },
};

export function esPlanValido(id: unknown): id is PlanId {
  return typeof id === "string" && id in PLANES;
}

// ── Checkout ────────────────────────────────────────────────────────────────

export interface SesionCheckout {
  id: string;
  url: string;
}

/**
 * Crea una sesión de Checkout.
 *
 * Usamos `price_data` inline: Stripe crea el producto y el precio en el
 * propio checkout. Así no hay nada que configurar a mano en el panel, lo
 * cual elimina un paso entero de onboarding y de errores humanos.
 */
export async function crearCheckout(opts: {
  plan: Plan;
  origen: string;
  email?: string;
  clienteId?: string;
  modo: "subscription" | "payment";
  referencia?: string;
}): Promise<SesionCheckout> {
  const { plan } = opts;

  const precio: Record<string, unknown> = {
    currency: "eur",
    unit_amount: plan.cantidad,
    product_data: {
      name: plan.nombre,
      description: plan.descripcion,
      metadata: { plan: plan.id },
    },
  };

  if (opts.modo === "subscription") {
    precio.recurring = { interval: plan.intervalo ?? "month" };
  }

  const cuerpo: Record<string, unknown> = {
    mode: opts.modo,
    line_items: [{ quantity: 1, price_data: precio }],
    success_url: `${opts.origen}/gracias?sesion={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.origen}/#precios`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    // SelloIA muestra precios con IVA incluido y lo declara en la factura,
    // así que no delegamos el cálculo fiscal a Stripe Managed Payments
    // (que además exige `tax_code` en cada producto).
    managed_payments: { enabled: false },
    customer: opts.clienteId,
    customer_email: opts.email,
    locale: "es",
    metadata: {
      plan: plan.id,
      referencia: opts.referencia ?? "",
      origen: "sello-ia.com",
    },
  };


  return await stripe<SesionCheckout>("POST", "/checkout/sessions", cuerpo);
}

// ── Verificación de firma de webhook ────────────────────────────────────────

/**
 * Verifica la firma `Stripe-Signature` sin depender del SDK.
 * Esquema: `t=<timestamp>,v1=<hmac>` donde el HMAC es
 * SHA-256 de `<timestamp>.<cuerpo>` con el secreto del endpoint.
 */
export async function verificarFirmaWebhook(
  cuerpo: string,
  cabeceraFirma: string | null,
  toleranciaSegundos = 300
): Promise<boolean> {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secreto || !cabeceraFirma) return false;

  const partes = new Map<string, string[]>();
  for (const trozo of cabeceraFirma.split(",")) {
    const [k, v] = trozo.split("=");
    if (k && v) {
      const lista = partes.get(k) ?? [];
      lista.push(v);
      partes.set(k, lista);
    }
  }

  const timestamp = partes.get("t")?.[0];
  const firmas = partes.get("v1") ?? [];
  if (!timestamp || firmas.length === 0) return false;

  const edad = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(edad) || edad > toleranciaSegundos) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const esperado = createHmac("sha256", secreto).update(`${timestamp}.${cuerpo}`, "utf8").digest("hex");

  const bufEsperado = Buffer.from(esperado, "utf8");
  for (const f of firmas) {
    const bufFirmado = Buffer.from(f, "utf8");
    if (bufFirmado.length !== bufEsperado.length) continue;
    if (timingSafeEqual(bufFirmado, bufEsperado)) return true;
  }
  return false;
}