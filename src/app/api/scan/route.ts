import { NextRequest } from "next/server";
import { track as va } from "@vercel/analytics";
import { escanear, UrlInvalida } from "@/lib/scanner/analyze";
import type { ResultadoScan } from "@/lib/types";

/**
 * POST /api/scan
 *
 * Límite de 30 s por función en el plan Hobby de Vercel: el escaneo está
 * diseñado para caber (timeout de 9 s por página, máximo 6 páginas en serie
 * + comprobación de rutas de transparencia en paralelo).
 *
 * Nota: no se declara `runtime` porque con `cacheComponents` activo es
 * incompatible; el runtime por defecto ya es Node.js.
 */
export const maxDuration = 30;

// ── Rate limiting en memoria ────────────────────────────────────────────────
// Nota: en serverless esto se reinicia en cada invocación fría. Suficiente para
// la versión pública; cuando haya tráfico real, mover a Upstash Redis.
const VENTANA_MS = 60 * 60 * 1000;
const LIMITE_PUBLICO = Number(process.env.SCAN_RATE_LIMIT ?? "8");
/** Límite para uso interno autenticado (prospección). Muy superior. */
const LIMITE_INTERNO = Number(process.env.SCAN_RATE_LIMIT_INTERNAL ?? "3000");
const cubos = new Map<string, number[]>();

/**
 * Uso interno con clave propia.
 *
 * El límite público existe para que nadie abuse del escáner. Pero bloqueaba
 * también a la prospección: de 564 dominios solo se escanearon 8 y el resto
 * devolvió 429, pareciendo que el mercado cumplía. Son dos cosas distintas y el
 * límite tiene que distinguirlas.
 */
function esInterno(req: NextRequest): boolean {
  const clave = process.env.SCAN_API_KEY;
  if (!clave) return false;
  const auth = req.headers.get("x-scan-key");
  const q = new URL(req.url).searchParams.get("key");
  return auth === clave || q === clave;
}

function rateLimit(ip: string, maximo: number): { ok: boolean; restantes: number } {
  const ahora = Date.now();
  const previos = (cubos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (previos.length >= maximo) {
    cubos.set(ip, previos);
    return { ok: false, restantes: 0 };
  }
  previos.push(ahora);
  cubos.set(ip, previos);
  return { ok: true, restantes: maximo - previos.length };
}

/**
 * Registra un evento de producto.
 *
 * El escáner es la única función del negocio que no puede fallar por el sake de
 * una métrica, así que cualquier error aquí se traga y sigue.
 */
function track(evento: string, valor?: string): void {
  try {
    va(evento, valor ? { valor } : undefined);
  } catch {
    /* sin analítica: el escaneo continúa igual */
  }
}

function ipDe(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "desconocida"
  );
}

function TooManyRequests(restantes: number) {
  return Response.json(
    { error: "demasiados", mensaje: "Has alcanzado el límite de escaneos por hora." },
    { status: 429, headers: { "Retry-After": String(Math.ceil(VENTANA_MS / 1000)) } }
  );
  void restantes;
}

export async function POST(req: NextRequest) {
  const ip = ipDe(req);
  const interno = esInterno(req);
  const limite = rateLimit(ip, interno ? LIMITE_INTERNO : LIMITE_PUBLICO);
  if (!limite.ok) return TooManyRequests(limite.restantes);

  let url = "";
  let honeypot = "";

  try {
    const cuerpo = await req.json();
    url = String(cuerpo?.url ?? "").slice(0, 2048);
    honeypot = String(cuerpo?.sitio ?? "");
  } catch {
    return Response.json(
      { error: "peticion", mensaje: "No hemos podido leer los datos enviados." },
      { status: 400 }
    );
  }

  // Honeypot: campo invisible para humanos. Si viene relleno, es un bot.
  if (honeypot) {
    return Response.json({ resultado: null as unknown as ResultadoScan }, { status: 200 });
  }

  if (!url.trim()) {
    return Response.json(
      { error: "url", mensaje: "Escribe la dirección de tu web." },
      { status: 400 }
    );
  }

  const rapido = new URL(req.url).searchParams.get("rapido") === "1";

  try {
    const resultado = await escanear(url, { rapido });

    // Métrica de producto. Lo que importa no es cuántas visitas recibe el sitio,
    // sino cuántas personas descubren que su web NO cumple: ese es el momento
    // exacto en que nace la intención de compra, y es lo único que permite
    // saber si el producto funciona sin depender de que alguien escriba.
    if (!interno) {
      track("escaneo", resultado.score >= 70 ? "cumple" : "no_cumple");
    }

    return Response.json(
      { resultado },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    if (e instanceof UrlInvalida) {
      return Response.json({ error: "url", mensaje: e.motivo }, { status: 400 });
    }
    const mensaje = e instanceof Error ? e.message : "Error desconocido en el escaneo.";
    return Response.json(
      {
        error: "escaneo",
        mensaje:
          "El escaneo ha fallado. Puede ser que el sitio esté caído, bloquee nuestro agente o tarde demasiado en responder.",
      },
      { status: 502 }
    );
  }
}