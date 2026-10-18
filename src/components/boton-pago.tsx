"use client";

import { useState } from "react";
import type { PlanId } from "@/lib/stripe";

const ETIQUETAS: Record<PlanId, string> = {
  pro: "Contratar Pro · 39 €",
  auditoria: "Pedir auditoría · 199 €",
  agencias: "Quiero el Kit Agencias · 499 €",
};

export default function BotonPago({
  plan,
  destacado = false,
  ancho = true,
}: {
  plan: PlanId;
  destacado?: boolean;
  ancho?: boolean;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pagar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const datos = await res.json();
      if (!res.ok || !datos.url) {
        throw new Error(datos.mensaje ?? "No hemos podido iniciar el pago.");
      }
      window.location.href = datos.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setCargando(false);
    }
  }

  return (
    <div className={ancho ? "w-full" : undefined}>
      <button
        type="button"
        onClick={pagar}
        disabled={cargando}
        className={`boton w-full ${destacado ? "boton-primario" : "boton-secundario"}`}
      >
        {cargando ? (
          <>
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
            />
            Redirigiendo a Stripe…
          </>
        ) : (
          ETIQUETAS[plan]
        )}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs leading-relaxed text-riesgo-critico">
          {error}
        </p>
      )}
    </div>
  );
}