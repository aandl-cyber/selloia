"use client";

import { useState } from "react";

/** Bloque de código con boton de copiar. Accesible: el estado se anuncia. */
export default function Codigo({ codigo, etiqueta }: { codigo: string; etiqueta: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2200);
    } catch {
      /* el usuario puede seleccionar a mano */
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-piedra-200">
      <div className="flex items-center justify-between border-b border-piedra-200 bg-piedra-100 px-3 py-2">
        <span className="font-mono text-xs text-piedra-600">{etiqueta}</span>
        <button
          type="button"
          onClick={copiar}
          className="rounded px-2 py-1 text-xs font-semibold text-marca-600 underline underline-offset-2 transition-colors hover:bg-white"
        >
          {copiado ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="max-h-44 overflow-auto bg-piedra-900 p-3.5 text-[11.5px] leading-relaxed text-piedra-100">
        <code>{codigo}</code>
      </pre>
      <p aria-live="polite" className="sr-only">
        {copiado ? "Código copiado al portapapeles" : ""}
      </p>
    </div>
  );
}