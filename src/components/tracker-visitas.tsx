"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Avisa al servidor de cada visita y de cada cambio de página.
 *
 * Se manda con `sendBeacon` cuando se puede, porque sobrevive a la descarga de
 * la página: si alguien cierra la pestaña justo al llegar, con `fetch` el aviso
 * se pierde y con `keepalive` también. `sendBeacon` está pensado exactamente
 * para métricas de salida.
 *
 * No guarda nada identificable en el navegador: ni cookies, ni localStorage, ni
 * identificador de usuario. El identificador de visitante se calcula en el
 * servidor con IP, agente y fecha, y solo sirve para contar únicos del día.
 */
export default function TrackerVisitas() {
  const ruta = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const avisar = () => {
      const cuerpo = JSON.stringify({
        ruta,
        ref: document.referrer ?? "",
      });

      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/visita", new Blob([cuerpo], { type: "application/json" }));
          return;
        }
      } catch {
        /* algunos navegadores bloquean sendBeacon; se cae al fetch */
      }

      fetch("/api/visita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: cuerpo,
        keepalive: true,
      }).catch(() => {
        /* una métrica perdida no puede romper la navegación */
      });
    };

    avisar();

    // El aviso se dispara también al volver a la pestaña, para no contar como
    // visita una sesión que ha estado abierta sin recargar.
    const alVolver = () => {
      if (document.visibilityState === "visible") avisar();
    };
    document.addEventListener("visibilitychange", alVolver);

    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [ruta]);

  return null;
}