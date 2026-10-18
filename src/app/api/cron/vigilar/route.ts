import { NextRequest } from "next/server";
import { escanear } from "@/lib/scanner/analyze";
import { enviar } from "@/lib/email";
import {
  leerEstado,
  escribirEstado,
  evaluarCambio,
  emailAviso,
} from "@/lib/monitor";

/**
 * GET|POST /api/cron/vigilar
 *
 * Ejecutado por Vercel Cron una vez al día. Reanaliza cada dominio registrado
 * y avisa SOLO cuando hay un cambio real.
 *
 * Un cron no se detiene por un fallo puntual: si un dominio falla se anota y se
 * sigue con el resto.
 */
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return ejecutar(req);
}
export async function POST(req: NextRequest) {
  return ejecutar(req);
}

async function ejecutar(req: NextRequest) {
  const url = new URL(req.url);
  const secreto = process.env.CRON_SECRET;

  // Vercel envia Authorization: Bearer <CRON_SECRET> en sus cron.
  const auth = req.headers.get("authorization");
  const autorizado =
    (secreto && auth === `Bearer ${secreto}`) ||
    (secreto && url.searchParams.get("secret") === secreto) ||
    url.searchParams.get("dry") === "1";

  if (!autorizado) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  const { estado, sha } = await leerEstado();
  if (estado.dominios.length === 0) {
    return Response.json({ ok: true, analizados: 0, aviso: "sin dominios registrados" });
  }

  console.log(`[cron] vigilando ${estado.dominios.length} dominio(s)`);

  let enviados = 0;
  const resumen: Record<string, string> = {};

  for (const registro of estado.dominios) {
    try {
      const r = await escanear(`https://${registro.dominio}`);

      if (r.estado === "fallido") {
        // No se marca como caída de cumplimiento: no hemos podido leerlo.
        resumen[registro.dominio] = `ilegible (${r.motivo ?? "sin detalle"})`;
        continue;
      }

      const actual = {
        score: r.score,
        criticos: r.stats.hallazgosCriticos,
        sistemas: r.detecciones.map((d) => d.proveedor),
      };

      const cambio = evaluarCambio(registro, actual);

      // Avisamos una vez por cambio; después el estado queda guardado y ya no
      // se repite el email hasta que vuelva a cambiar algo.
      if (cambio.tipo !== "sin_cambios" && cambio.tipo !== "ilegible") {
        const { asunto, html } = emailAviso(cambio);
        if (asunto) {
          const enviado = await enviar({ para: registro.email, asunto, html });
          if (enviado.ok) enviados++;
          resumen[registro.dominio] = `${cambio.tipo} · ${
            enviado.ok ? "aviso enviado" : `aviso fallido: ${enviado.motivo}`
          }`;
        }
      } else {
        resumen[registro.dominio] = "sin cambios";
      }

      registro.anterior = { ...actual, fecha: new Date().toISOString() };
      registro.avisado = false;
    } catch (e) {
      resumen[registro.dominio] = `error: ${e instanceof Error ? e.message : "desconocido"}`;
      console.error(`[cron] fallo en ${registro.dominio}:`, e);
    }
  }

  try {
    await escribirEstado(estado, sha);
  } catch (e) {
    console.error("[cron] no se pudo guardar el estado:", e);
    return Response.json(
      { ok: false, error: "no se pudo guardar el estado", resumen },
      { status: 500 }
    );
  }

  console.log(`[cron] terminado. ${enviados} aviso(s) enviado(s).`);
  return Response.json({ ok: true, analizados: estado.dominios.length, enviados, resumen });
}