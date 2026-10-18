"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Resultado from "@/components/resultado";
import type { ResultadoScan } from "@/lib/types";

type Estado =
  | { fase: "inicial" }
  | { fase: "cargando" }
  | { fase: "error"; mensaje: string }
  | { fase: "listo"; resultado: ResultadoScan };

export default function Escanner() {
  const [url, setUrl] = useState("");
  const [estado, setEstado] = useState<Estado>({ fase: "inicial" });
  const [email, setEmail] = useState("");
  const router = useRouter();

  async function lanzar(e?: React.FormEvent) {
    e?.preventDefault();
    const limpio = url.trim();
    if (!limpio) {
      setEstado({ fase: "error", mensaje: "Escribe la dirección de tu web." });
      return;
    }

    setEstado({ fase: "cargando" });

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: limpio, sitio: "" }),
      });
      const datos = await res.json();

      if (res.status === 429) {
        setEstado({
          fase: "error",
          mensaje:
            "Has hecho demasiados escaneos seguidos. Espera un poco o escríbenos y lo hacemos por ti.",
        });
        return;
      }
      if (!res.ok || datos.error) {
        setEstado({ fase: "error", mensaje: datos.mensaje ?? "No hemos podido completar el escaneo." });
        return;
      }
      if (!datos.resultado) return; // honeypot
      setEstado({ fase: "listo", resultado: datos.resultado });
    } catch {
      setEstado({
        fase: "error",
        mensaje: "Se ha perdido la conexión. Comprueba tu red y vuelve a intentarlo.",
      });
    }
  }

  async function suscribir(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return;
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, url: url.trim() }),
      });
    } catch {
      /* silencioso: nunca bloquear la conversión por el email */
    }
  }

  const ocupado = estado.fase === "cargando";

  return (
    <div>
      <form onSubmit={lanzar} className="flex flex-col gap-3 sm:flex-row" noValidate>
        <div className="relative flex-1">
          <label htmlFor="url" className="sr-only">
            Dirección de tu web
          </label>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-piedra-400"
          >
            https://
          </span>
          <input
            id="url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="tuempresa.es"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={ocupado}
            className="campo pl-[4.5rem] font-mono"
            aria-describedby={estado.fase === "error" ? "error-escaneo" : undefined}
          />
        </div>

        {/* Honeypot: invisible para personas, tentador para bots. */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="sitio">Sitio web</label>
          <input
            id="sitio"
            name="sitio"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value=""
            readOnly
          />
        </div>

        <button
          type="submit"
          disabled={ocupado}
          aria-busy={ocupado}
          aria-describedby={estado.fase === "error" ? "error-escaneo" : undefined}
          className="boton boton-acento sm:px-6"
        >
          {ocupado ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Analizando…
            </>
          ) : (
            "Escanear gratis"
          )}
        </button>
      </form>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-piedra-500">
        <span>Sin tarjeta.</span>
        <span>Sin registro.</span>
        <span>60 segundos.</span>
      </p>

      <div aria-live="polite" className="mt-6">
        {estado.fase === "error" && (
          <div
            id="error-escaneo"
            role="alert"
            className="animar-entrada rounded-lg border border-riesgo-critico/25 bg-riesgo-critico-fondo p-4"
          >
            <p className="text-sm font-medium text-riesgo-critico">No hemos podido escanear</p>
            <p className="mt-1 text-sm text-piedra-700">{estado.mensaje}</p>
          </div>
        )}

        {estado.fase === "listo" && (
          <div className="animar-entrada">
            <Resultado resultado={estado.resultado} />
            <form onSubmit={suscribir} className="tarjeta mt-5 p-5">
              <label htmlFor="email" className="text-sm font-semibold text-piedra-900">
                ¿Quieres que te avisemos si esto cambia?
              </label>
              <p className="mt-1 text-sm text-piedra-500">
                Vigilamos tu dominio y te escribimos si un sistema de IA nuevo aparece sin
                aviso, o si desaparece el que tienes. Sin spam, te puedes dar de baja cuando
                quieras.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="campo flex-1"
                />
                <button type="submit" className="boton boton-secundario">
                  Vigilar mi web
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {estado.fase === "listo" && (
        <button
          type="button"
          onClick={() => {
            setEstado({ fase: "inicial" });
            setUrl("");
            router.refresh();
          }}
          className="mt-4 text-sm font-medium text-marca-600 underline underline-offset-4 hover:text-marca-700"
        >
          Escanear otra web
        </button>
      )}
    </div>
  );
}