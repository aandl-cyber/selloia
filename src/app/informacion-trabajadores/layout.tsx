import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Los metadatos viven aquí y no en `page.tsx` porque la página es un Client
 * Component (tiene estado para el formulario), y Next no admite `export const
 * metadata` en un módulo cliente.
 */
export const metadata: Metadata = {
  title: "Aviso para trabajadores · Real Decreto 723/2026",
  description:
    "Genera gratis la información escrita que el Real Decreto 723/2026 obliga a entregar a la plantilla cuando hay sistemas de IA en decisiones laborales. Texto listo para imprimir.",
  alternates: { canonical: "/informacion-trabajadores" },
  openGraph: {
    title: "Aviso para la plantilla · Real Decreto 723/2026",
    description:
      "El RD 723/2026 entró en vigor el 5 de octubre de 2026. Genera el aviso en español, listo para entregar.",
    url: "https://sello-ia.com/informacion-trabajadores",
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}