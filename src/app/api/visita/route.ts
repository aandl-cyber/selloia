import { NextRequest, NextResponse } from "next/server";
import { registrarVisita } from "@/lib/visitas";

/**
 * POST /api/visita
 *
 * Recibe el aviso de una visita y lo registra. El país lo pone la plataforma en
 * las cabeceras de Vercel (`x-vercel-ip-country`), no el cliente: si lo enviara
 * el navegador, sería inventado y no valdría para nada.
 *
 * Nunca devuelve error aunque falle el registro: si el tracker rompiera el
 * render, se perderían las visitas justo cuando más falta hacen.
 *
 * No se declara `dynamic` porque con `cacheComponents` activo es incompatible,
 * y además es innecesario: una ruta POST no se cachea.
 */

/** Extrae el dominio de referencia, sin query string ni credenciales. */
function dominioDe(referencia: string): string {
  if (!referencia) return "";
  try {
    return new URL(referencia).hostname.replace(/^www\./, "");
  } catch {
    return referencia.slice(0, 60);
  }
}

export async function POST(req: NextRequest) {
  let ruta = "/";
  let ref = "";

  try {
    const cuerpo = await req.json();
    ruta = String(cuerpo?.ruta ?? "/").slice(0, 120);
    ref = String(cuerpo?.ref ?? "").slice(0, 200);
  } catch {
    /* sin cuerpo: se registra la visita a la raíz, que es lo más probable */
  }

  const h = req.headers;
  await registrarVisita({
    ruta,
    ref: dominioDe(ref),
    agente: h.get("user-agent") ?? "",
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    pais: h.get("x-vercel-ip-country") ?? "??",
  });

  // 204 y no 200: la respuesta no lleva cuerpo, que es lo que espera un beacon.
  // Devolver JSON con 204 es un error en Node y provoca un 500.
  return new NextResponse(null, { status: 204 });
}