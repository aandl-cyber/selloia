import type { Metadata } from "next";
import Link from "next/link";
import Codigo from "@/components/codigo-sello";

export const metadata: Metadata = {
  title: "El SelloIA",
  description:
    "Distintivo verificable de cumplimiento del Artículo 50 del Reglamento Europeo de IA, con página pública de comprobación en vivo.",
  alternates: { canonical: "/sello" },
  openGraph: {
    title: "El SelloIA · distintivo verificable",
    description: "Un badge que cualquiera puede comprobar. Sin nosotros en medio.",
    url: "https://sello-ia.com/sello",
  },
};

export default function Sello() {
  return (
    <div className="contenedor py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="tarjeta p-8 text-center">
          <span
            aria-hidden="true"
            className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-piedra-900 font-display text-xl font-bold text-white"
          >
            S
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold text-piedra-900">
            El SelloIA
          </h1>
          <p className="mt-3 leading-relaxed text-piedra-600">
            Un distintivo que dice que tu web cumple el Artículo 50 del Reglamento Europeo
            de IA. Y, a diferencia de un sello impreso,{" "}
            <strong>cualquiera puede comprobarlo en este momento</strong>. No passes por
            nosotros: el badge consulta el estado real de tu dominio.
          </p>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-piedra-900">
            Por qué un sello verificable y no un sello de honor
          </h2>
          <p className="mt-4 leading-relaxed text-piedra-700">
            Un distintivo que se comprueba una vez y luego caducado es peor que no tener
            nada: da confianza y luego la pierde. Este badge se reevalúa cada vez que se
            muestra, así que refleja el estado real de tu web.
          </p>
          <ul className="mt-5 space-y-2.5">
            {[
              "Si alguien abre el badge, ve la fecha del último análisis.",
              "Si alguien pulsa, ve la evidencia: qué sistema se detectó y en qué página.",
              "Si alguien lo comprueba cada mes y falla, lo ves. No lo ves el día de la inspección.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5 leading-relaxed text-piedra-700">
                <span aria-hidden="true" className="mt-0.5 shrink-0 text-riesgo-ok">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold text-piedra-900">
            Cómo se pone
          </h2>
          <p className="mt-4 leading-relaxed text-piedra-700">
            Pega el aviso junto a tu chat y añade el distintivo donde quieras mostrarlo. El
            widget del aviso es el mismo que exige el Art. 50.1, así que no es un adorno:
            es la parte que te salva de la sanción.
          </p>

          <div className="tarjeta mt-6 p-5">
            <h3 className="text-sm font-semibold text-piedra-900">
              1. El aviso de inteligencia artificial
            </h3>
            <p className="mt-1 text-sm text-piedra-600">
              Va dentro de tu widget de chat. Es el Art. 50.1.
            </p>
            <Codigo
              etiqueta="aviso-ia.js"
              codigo={`<script src="https://sello-ia.com/aviso-ia.js" defer data-empresa="Tu empresa"></script>`}
            />
          </div>

          <div className="tarjeta mt-4 p-5">
            <h3 className="text-sm font-semibold text-piedra-900">
              2. El distintivo
            </h3>
            <p className="mt-1 text-sm text-piedra-600">
              Muestra que lo tienes. Cambia <code>tu-dominio.es</code> por el tuyo.
            </p>
            <Codigo
              etiqueta="sello"
              codigo={`<a href="https://sello-ia.com/sello?dominio=tu-dominio.es">
  <img src="https://sello-ia.com/sello.svg?dominio=tu-dominio.es"
       alt="Cumplimiento verificado del Art. 50 del Reglamento Europeo de IA">
</a>`}
            />
          </div>
        </section>

        <div className="mt-10 rounded-lg border border-piedra-200 bg-white p-6 text-center">
          <p className="text-sm leading-relaxed text-piedra-600">
            El distintivo va incluido en Pro y en Auditoría. En el plan Agencias sale con
            tu marca, sin el nuestro.
          </p>
          <Link href="/precios" className="boton boton-acento mt-4">
            Ver precios
          </Link>
        </div>
      </div>
    </div>
  );
}