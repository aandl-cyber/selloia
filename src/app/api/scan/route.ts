import { NextRequest } from "next/server";
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
const MAX_POR_HORA = 8;
const cubos = new Map<string, number[]>();

function rateLimit(ip: string): { ok: boolean; restantes: number } {
  const ahora = Date.now();
  const previos = (cubos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (previos.length >= MAX_POR_HORA) {
    cubos.set(ip, previos);
    return { ok: false, restantes: 0 };
  }
  previos.push(ahora);
  cubos.set(ip, previos);
  return { ok: true, restantes: MAX_POR_HORA - previos.length };
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
  const limite = rateLimit(ip);
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

  try {
    const resultado = await escanear(url);
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