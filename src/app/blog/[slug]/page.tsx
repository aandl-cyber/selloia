import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICULOS, HELPERS } from "@/content/articulos";

const BASE = "https://sello-ia.com";

export function generateStaticParams() {
  return ARTICULOS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = ARTICULOS.find((x) => x.slug === slug);
  if (!a) return { title: "Artículo no encontrado" };

  return {
    title: a.titulo,
    description: a.descripcion,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.titulo,
      description: a.descripcion,
      url: `${BASE}/blog/${a.slug}`,
      publishedTime: a.fecha,
      modifiedTime: a.actualizado ?? a.fecha,
      locale: "es_ES",
    },
    twitter: { card: "summary_large_image", title: a.titulo, description: a.descripcion },
  };
}

export default async function ArticuloPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const a = ARTICULOS.find((x) => x.slug === slug);
  if (!a) notFound();

  const otros = ARTICULOS.filter((x) => x.slug !== slug);

  // FAQPage: lo que hace que Google muestre el desplegable de preguntas
  // directamente en los resultados.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: a.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <article className="contenedor py-16 md:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="mx-auto max-w-3xl">
        <nav aria-label="Ruta de navegación" className="text-sm">
          <Link href="/blog" className="text-piedra-500 hover:text-piedra-900">
            Blog
          </Link>
          <span className="mx-2 text-piedra-300">/</span>
          <span className="text-piedra-600">{a.categoria}</span>
        </nav>

        <header className="mt-6">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-piedra-900 md:text-4xl">
            {a.titulo}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-piedra-500">
            <time dateTime={a.fecha}>
              {new Date(a.fecha).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
            <span>·</span>
            <span>{a.minutos} min de lectura</span>
            {a.actualizado && a.actualizado !== a.fecha && (
              <>
                <span>·</span>
                <span>
                  Actualizado el{" "}
                  {new Date(a.actualizado).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
          </div>
        </header>

        <div className="mt-10">{a.cuerpo(HELPERS)}</div>

        {/* CTA */}
        <div className="tarjeta mt-12 p-6 text-center">
          <h2 className="font-display text-xl font-semibold text-piedra-900">
            ¿Tu web cumple esto?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-piedra-600">
            La guía explica la norma. El escaneo comprueba tu web concreta: qué sistemas de
            IA tiene, dónde, y si les falta el aviso.
          </p>
          <Link href="/#escanner" className="boton boton-acento mt-5">
            Escaneo gratuito · 60 segundos
          </Link>
        </div>

        {/* FAQ */}
        {a.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold text-piedra-900">
              Preguntas frecuentes
            </h2>
            <div className="mt-5 space-y-3">
              {a.faq.map((f) => (
                <details key={f.q} className="tarjeta group p-5">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-piedra-900 marker:hidden">
                    <span className="flex items-start justify-between gap-4">
                      {f.q}
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-piedra-400 transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-piedra-600">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Otros artículos */}
        {otros.length > 0 && (
          <section className="mt-12 border-t border-piedra-200 pt-8">
            <h2 className="font-display text-lg font-semibold text-piedra-900">
              Sigue leyendo
            </h2>
            <ul className="mt-4 space-y-2.5">
              {otros.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/blog/${o.slug}`}
                    className="text-sm text-marca-600 underline underline-offset-4"
                  >
                    {o.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10 rounded-lg border border-piedra-200 bg-riesgo-medio-fondo p-4">
          <p className="text-xs leading-relaxed text-piedra-700">
            <strong>Aviso.</strong> Este artículo es informativo y{" "}
            <strong>no constituye asesoramiento jurídico</strong>. Las obligaciones
            concretas dependen de tu situación. Para decisiones con consecuencias,
            consulta con un profesional del derecho.
          </p>
        </div>
      </div>
    </article>
  );
}

