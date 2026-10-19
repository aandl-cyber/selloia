import { NextRequest } from "next/server";
import { registrarDominio, bajaDominio, leerEstado } from "@/lib/monitor";

/**
 * GET  /api/vigilancia           → lista los dominios vigilados
 * POST /api/vigilancia           → { accion: "alta"|"baja", dominio, email }
 *
 * Alta gratuita: hasta 3 dominios, que es lo que necesita el plan gratuito
 * para probar el servicio. El límite de pago lo aplica el flujo de compra.
 */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return Response.json({ error: "no autorizado" }, { status: 401 });
  const { estado } = await leerEstado();
  return Response.json({
    total: estado.dominios.length,
    dominios: estado.dominios.map((d) => ({
      dominio: d.dominio,
      alta: d.alta,
      ultimaRevision: d.anterior?.fecha ?? null,
      puntuacion: d.anterior?.score ?? null,
      sistemas: d.anterior?.sistemas ?? [],
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return Response.json({ error: "no autorizado" }, { status: 401 });

  let cuerpo: { accion?: string; dominio?: string; email?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return Response.json({ error: "json" }, { status: 400 });
  }

  const dominio = String(cuerpo.dominio ?? "").trim();
  const email = String(cuerpo.email ?? "").trim();

  if (!dominio) return Response.json({ error: "dominio" }, { status: 400 });

  if (cuerpo.accion === "baja") {
    const ok = await bajaDominio(dominio);
    return Response.json({ ok, accion: "baja" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return Response.json({ error: "email", mensaje: "Necesitamos un email válido." }, { status: 400 });
  }

  const { estado } = await leerEstado();
  if (estado.dominios.length >= 3 && !estado.dominios.some((d) => d.dominio === dominio.toLowerCase())) {
    return Response.json(
      {
        error: "limite",
        mensaje: "La prueba gratuita cubre 3 dominios. El plan Pro no tiene límite.",
        precio: "19,99 €/mes — https://sello-ia.com/precios",
      },
      { status: 402 }
    );
  }

  const ok = await registrarDominio(dominio, email);
  return Response.json({ ok, accion: "alta" }, { status: ok ? 201 : 200 });
}

function autorizado(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secreto && auth === `Bearer ${secreto}`) return true;
  if (secreto && new URL(req.url).searchParams.get("secret") === secreto) return true;
  return !secreto;
}