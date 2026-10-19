"use client";

import { useState } from "react";
import type { ResultadoScan, Severity } from "@/lib/types";

const META_SEVERIDAD: Record<Severity, { etiqueta: string; clase: string; punto: string }> = {
  critico: { etiqueta: "Crítico", clase: "riesgo-critico", punto: "bg-riesgo-critico" },
  alto: { etiqueta: "Alto", clase: "riesgo-alto", punto: "bg-riesgo-alto" },
  medio: { etiqueta: "Medio", clase: "riesgo-medio", punto: "bg-riesgo-medio" },
  bajo: { etiqueta: "Bajo", clase: "riesgo-bajo", punto: "bg-riesgo-bajo" },
  ok: { etiqueta: "Correcto", clase: "riesgo-bajo", punto: "bg-riesgo-ok" },
};

const NOMBRE_ARTICULO: Record<string, string> = {
  "art50.1": "Art. 50.1 · Aviso al interactuar con IA",
  "art50.2": "Art. 50.2 · Marcado legible por máquina",
  "art50.4": "Art. 50.4 · Etiquetado de contenido sintético",
  "art50.5": "Art. 50.5 · Deepfakes y contenido público",
  art4: "Art. 4 · Alfabetización en IA",
  art26: "Art. 26 · Obligaciones del despliegue",
  gdpr: "RGPD",
};

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Copiador({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      /* el usuario puede seleccionar manualmente */
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-piedra-200">
      <div className="flex items-center justify-between border-b border-piedra-200 bg-piedra-100 px-3 py-2">
        <span className="text-xs font-medium text-piedra-600">Texto listo para pegar</span>
        <button
          type="button"
          onClick={copiar}
          className="rounded px-2 py-1 text-xs font-semibold text-marca-600 transition-colors hover:bg-white"
        >
          {copiado ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="max-h-56 overflow-auto bg-piedra-900 p-3.5 text-[11.5px] leading-relaxed text-piedra-100">
        <code>{texto}</code>
      </pre>
    </div>
  );
}

function Anillo({ score }: { score: number }) {
  const r = 52;
  const circunferencia = 2 * Math.PI * r;
  const relleno = (score / 100) * circunferencia;

  const color =
    score >= 85 ? "var(--color-riesgo-ok)"
      : score >= 60 ? "var(--color-riesgo-medio)"
      : score >= 30 ? "var(--color-riesgo-alto)"
      : "var(--color-riesgo-critico)";

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center">
      <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={`Puntuación ${score} sobre 100`}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--color-piedra-200)" strokeWidth="10" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${relleno} ${circunferencia}`}
          transform="rotate(-90 66 66)"
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-piedra-400">
          sobre 100
        </span>
      </div>
    </div>
  );
}

export default function Resultado({ resultado }: { resultado: ResultadoScan }) {
  // Escaneo fallido: no hay puntuación de riesgo que mostrar. Mostrar un 0
  // "crítico" convertiría un problema técnico en un veredicto legal falso.
  if (resultado.estado === "fallido") {
    return (
      <section aria-label="Escaneo no completado" className="tarjeta p-6 md:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-riesgo-medio-fondo text-xl text-riesgo-medio"
          >
            ⟳
          </span>
          <div>
            <h3 className="font-display text-xl font-bold text-piedra-900">
              No hemos podido completar el escaneo
            </h3>
            <p className="mt-2 leading-relaxed text-piedra-600">{resultado.resumen}</p>
            {resultado.motivo && (
              <p className="mt-3 inline-block rounded bg-piedra-100 px-3 py-1.5 font-mono text-xs text-piedra-600">
                Detalle técnico: {resultado.motivo}
              </p>
            )}
            <p className="mt-4 text-sm leading-relaxed text-piedra-500">
              Esto <strong className="font-semibold text-piedra-800">no es un
              incumplimiento</strong>: no hemos podido leer la web, así que no tenemos
              nada que concluir sobre ella. Prueba de nuevo en unos minutos; si el
              problema persiste, escríbenos y lo revisamos a mano.
            </p>
            <a href="#escanner" className="boton boton-secundario mt-5">
              Reintentar
            </a>
          </div>
        </div>
      </section>
    );
  }

  const problemas = resultado.hallazgos.filter((h) => h.severity !== "ok");
  const correctos = resultado.hallazgos.filter((h) => h.severity === "ok");

  return (
    <section aria-label="Resultado del escaneo" className="tarjeta overflow-hidden">
      {/* Cabecera */}
      <div className="flex flex-col gap-5 border-b border-piedra-200 p-6 sm:flex-row sm:items-center">
        <Anillo score={resultado.score} />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-piedra-400">
            {host(resultado.urlNormalizada)}
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold text-piedra-900">
            {resultado.stats.cumplimientoArt50
              ? "Cumples lo verificable del Art. 50"
              : `${resultado.stats.hallazgosCriticos} incumplimiento${
                  resultado.stats.hallazgosCriticos === 1 ? "" : "s"
                } crítico${
                  resultado.stats.hallazgosCriticos === 1 ? "" : "s"
                }`}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-piedra-600">{resultado.resumen}</p>
        </div>
      </div>

      {/* Detección */}
      {resultado.detecciones.length > 0 && (
        <div className="border-b border-piedra-200 p-6">
          <h4 className="text-sm font-semibold text-piedra-900">
            Sistemas de IA detectados ({resultado.stats.sistemasIA})
          </h4>
          <ul className="mt-3 divide-y divide-piedra-100">
            {resultado.detecciones.map((d, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-piedra-800">{d.proveedor}</p>
                  <p className="truncate text-xs text-piedra-400">
                    {new URL(d.pagina).pathname} · detectado por «{d.firma}»
                  </p>
                </div>
                <span
                  className={`etiqueta-riesgo ${
                    d.conAviso ? "riesgo-bajo" : "riesgo-critico"
                  }`}
                >
                  {d.conAviso ? "Con aviso" : "Sin aviso"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hallazgos accionables */}
      {problemas.length > 0 && (
        <div className="border-b border-piedra-200 p-6">
          <h4 className="text-sm font-semibold text-piedra-900">
            Qué corregir ({problemas.length})
          </h4>
          <div className="mt-4 space-y-4">
            {problemas.map((h) => {
              const meta = META_SEVERIDAD[h.severity];
              return (
                <article key={h.id} className="rounded-lg border border-piedra-200">
                  <div className="flex flex-wrap items-start justify-between gap-2 p-4">
                    <div className="min-w-0 flex-1">
                      <span className={`etiqueta-riesgo ${meta.clase}`}>{meta.etiqueta}</span>
                      <h5 className="mt-2 text-sm font-semibold leading-snug text-piedra-900">
                        {h.titulo}
                      </h5>
                      <p className="mt-1 text-xs text-piedra-400">
                        {NOMBRE_ARTICULO[h.articulo] ?? h.articulo}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-piedra-100 px-4 py-3.5">
                    <p className="text-sm leading-relaxed text-piedra-600">{h.descripcion}</p>

                    {h.evidencia && (
                      <p className="mt-2.5 rounded bg-piedra-100 px-3 py-2 font-mono text-[11px] leading-relaxed text-piedra-600">
                        <span className="font-sans font-semibold text-piedra-700">Evidencia:</span>{" "}
                        {h.evidencia}
                      </p>
                    )}

                    <div className="mt-3.5 border-l-2 border-marca-500 pl-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-marca-600">
                        Cómo se arregla
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-piedra-700">
                        {h.solucion}
                      </p>
                    </div>

                    {h.snippet && <Copiador texto={h.snippet} />}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Lo que ya está bien */}
      {correctos.length > 0 && (
        <div className="border-b border-piedra-200 bg-riesgo-bajo-fondo/40 p-6">
          <h4 className="text-sm font-semibold text-piedra-900">Lo que ya haces bien</h4>
          <ul className="mt-3 space-y-2.5">
            {correctos.map((h) => (
              <li key={h.id} className="flex gap-2.5 text-sm leading-relaxed text-piedra-700">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-riesgo-ok">
                  ✓
                </span>
                <span>
                  <strong className="font-semibold">{h.titulo}.</strong> {h.descripcion}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cierre comercial.
          Va aquí, y no antes, por un motivo concreto: el visitante ya ha leído
          qué tiene mal, tiene el texto para arreglarlo delante, y ahora decide.
          Si el botón de compra aparece antes del diagnóstico, es publicidad; si
          aparece después, es la respuesta a lo que acaba de leer. */}
      {problemas.length > 0 && (
        <div className="border-b border-piedra-200 bg-piedra-900 p-6 sm:p-8">
          <h4 className="font-display text-xl font-bold text-white">
            El texto ya lo tienes. Lo que falta es que no se rompa mañana.
          </h4>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-piedra-300">
            Puedes pegar el aviso ahora mismo y quedarte ahí. El problema es que
            nadie lo revisa después: actualizáis el tema, alguien monta un chatbot
            nuevo, el CSS tapa el aviso en móvil y nadie se entera hasta que alguien
            pregunta.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-piedra-700 bg-piedra-800 p-5">
              <p className="text-sm font-semibold text-white">Pro · 19,99 € al mes</p>
              <p className="mt-1 text-xs text-piedra-400">Por dominio</p>
              <ul className="mt-3 space-y-1.5 text-sm text-piedra-300">
                <li>✓ Reescanéo cada 30 días</li>
                <li>✓ Te aviso el día que el aviso desaparezca</li>
                <li>✓ Te aviso si montas un sistema nuevo</li>
                <li>✓ Cancelas cuando quieras</li>
              </ul>
              <a href="/precios" className="boton boton-acento mt-4 w-full">
                Contratar Pro
              </a>
            </div>

            <div className="rounded-lg border border-piedra-700 bg-piedra-800 p-5">
              <p className="text-sm font-semibold text-white">Auditoría · 199 €</p>
              <p className="mt-1 text-xs text-piedra-400">Pago único</p>
              <ul className="mt-3 space-y-1.5 text-sm text-piedra-300">
                <li>✓ Todo lo de Pro durante 12 meses</li>
                <li>✓ Instalamos los avisos y la página de transparencia</li>
                <li>✓ Informe firmado en PDF</li>
                <li>✓ Canal directo por email</li>
              </ul>
              {/* Botón claro, no `boton-primario`: ese es #1c1917 sobre una
                  tarjeta #292524, es decir casi negro sobre casi negro. Además
                  la jerarquía queda mejor: Pro en azul (la compra de impulso),
                  Auditoría en blanco. */}
              <a href="/precios" className="boton boton-secundario mt-4 w-full">
                Pedir auditoría
              </a>
            </div>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-piedra-400">
            Si el escaneo se equivoca, escríbenos y lo arreglamos o te devolvemos el
            dinero. SelloIA es un producto nuevo y preferimos decirlo por adelantado.
          </p>
        </div>
      )}

      {/* Pie técnico */}
      <div className="p-6">
        <dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-piedra-400">Páginas analizadas</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-piedra-800">
              {resultado.stats.paginasAnalizadas}
            </dd>
          </div>
          <div>
            <dt className="text-piedra-400">Duración</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-piedra-800">
              {(resultado.durationMs / 1000).toFixed(1)} s
            </dd>
          </div>
          <div>
            <dt className="text-piedra-400">Fecha</dt>
            <dd className="mt-0.5 text-sm font-semibold text-piedra-800">
              {new Date(resultado.fecha).toLocaleDateString("es-ES")}
            </dd>
          </div>
          <div>
            <dt className="text-piedra-400">Referencia</dt>
            <dd className="mt-0.5 text-sm font-semibold text-piedra-800">Art. 50 · UE 2024/1689</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}