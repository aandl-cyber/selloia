import type { MetadataRoute } from "next";

const BASE = "https://selloia.es";

export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();

  const estaticas = [
    { path: "", prioridad: 1.0, frecuencia: "weekly" as const },
    { path: "/comprobar", prioridad: 0.9, frecuencia: "monthly" as const },
    { path: "/precios", prioridad: 0.9, frecuencia: "monthly" as const },
    { path: "/sello", prioridad: 0.8, frecuencia: "monthly" as const },
    { path: "/blog", prioridad: 0.8, frecuencia: "weekly" as const },
    { path: "/estado", prioridad: 0.4, frecuencia: "daily" as const },
  ];

  const legales = [
    "/transparencia-ia",
    "/aviso-legal",
    "/privacidad",
    "/cookies",
  ].map((path) => ({ path, prioridad: 0.3, frecuencia: "yearly" as const }));

  const guias = [
    "/blog/articulo-50-reglamento-ia",
    "/blog/chatbot-sin-aviso-multa",
    "/blog/obligaciones-pymes-ley-ia",
    "/blog/como-etiquetar-contenido-generado-ia",
    "/blog/articulo-4-alfabetizacion-ia",
  ].map((path) => ({ path, prioridad: 0.7, frecuencia: "monthly" as const }));

  return [...estaticas, ...guias, ...legales].map((e) => ({
    url: `${BASE}${e.path}`,
    lastModified: ahora,
    changeFrequency: e.frecuencia,
    priority: e.prioridad,
  }));
}