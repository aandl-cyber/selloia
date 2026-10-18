import type { Metadata } from "next";
import Link from "next/link";
import { ARTICULOS } from "@/content/articulos";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guías prácticas sobre el cumplimiento del Reglamento Europeo de Inteligencia Artificial: qué obliga, desde cuándo y cómo se hace. En español y sin humo.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog · SelloIA",
    description:
      "Qué es el Artículo 50 del AI Act, qué multa hay por no avisar de un chatbot y cómo se corrige en cinco minutos.",
    url: "https://sello-ia.com/blog",
  },
};

export default function Blog() {
  const ordenados = [...ARTICULOS].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="contenedor py-16 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight text-piedra-900 md:text-5xl">
          Guías prácticas
        </h1>
        <p className="mt-4 text-lg text-piedra-600">
          El Reglamento Europeo de IA explicado sin jerga y sin venderte humo. Cada guía
          responde una pregunta concreta que nos llega por email.
        </p>
      </div>

      <div className="mx-auto mt-14 max-w-3xl space-y-5">
        {ordenados.map((a) => (
          <article key={a.slug} className="tarjeta p-6 transition-shadow hover:shadow-md">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-full bg-piedra-100 px-2.5 py-1 font-medium text-piedra-600">
                {a.categoria}
              </span>
              <time dateTime={a.fecha} className="text-piedra-400">
                {new Date(a.fecha).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              <span className="text-piedra-400">{a.minutos} min de lectura</span>
            </div>

            <h2 className="mt-3 font-display text-xl font-bold leading-snug text-piedra-900">
              <Link href={`/blog/${a.slug}`} className="hover:text-marca-600">
                {a.titulo}
              </Link>
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-piedra-600">
              {a.descripcion}
            </p>

            <Link
              href={`/blog/${a.slug}`}
              className="mt-4 inline-block text-sm font-medium text-marca-600 underline underline-offset-4"
            >
              Leer la guía →
            </Link>
          </article>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-3xl rounded-lg border border-piedra-200 bg-white p-6 text-center">
        <h2 className="font-display text-lg font-semibold text-piedra-900">
          ¿Y mi web en concreto?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-piedra-600">
          Estas guías explican la norma. El escaneo te dice si tu web concreta la cumple
          ahora mismo, con la evidencia de qué sistema ha encontrado y en qué página.
        </p>
        <Link href="/#escanner" className="boton boton-acento mt-5">
          Escanea mi web gratis
        </Link>
      </div>
    </div>
  );
}