import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de cookies",
  description:
    "Qué cookies y tecnologías similares usa SelloIA, para qué sirven y cómo gestionarlas.",
  alternates: { canonical: "/cookies" },
};

const CATEGORIAS = [
  {
    nombre: "Esenciales",
    obligatoria: true,
    descripcion:
      "Necesarias para que el sitio funcione. Sin ellas no podemos procesar el escaneo ni distinguir visitantes legítimos de ataques automatizados.",
    ejemplos: "Gestión de sesión, límite de escaneos por IP y control antiautomatización.",
  },
  {
    nombre: "Analítica",
    obligatoria: false,
    descripcion:
      "Nos permiten entender cómo se usa el producto para mejorarlo. Agregadas y sin identificarte.",
    ejemplos: "Google Analytics.",
  },
  {
    nombre: "Marketing",
    obligatoria: false,
    descripcion:
      "Se activan únicamente si decides mirar la campaña. Nunca las usamos para perfiles de terceros ni las cedemos.",
    ejemplos: "Meta Pixel, Google Ads.",
  },
];

export default function Cookies() {
  return (
    <div className="contenedor py-16 md:py-20">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-piedra-900">
          Política de cookies
        </h1>
        <p className="mt-3 text-sm text-piedra-500">
          Última actualización: <time dateTime="2026-10-18">18 de octubre de 2026</time>
        </p>

        <section className="tarjeta mt-8 p-6">
          <h2 className="font-display text-lg font-semibold text-piedra-900">
            Titular del sitio
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-piedra-700">
            <strong className="text-piedra-900">A &amp; L Marketing Ltd</strong> · 2
            Frederick Street, Kings Cross, London, United Kingdom, WC1X 0ND ·{" "}
            <a href="mailto:hola@sello-ia.com" className="text-marca-600 underline underline-offset-2">
              hola@sello-ia.com
            </a>
          </p>
        </section>

        <div className="mt-8 space-y-6">
          {CATEGORIAS.map((c) => (
            <section key={c.nombre} className="tarjeta p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-piedra-900">
                  {c.nombre}
                </h2>
                <span
                  className={`etiqueta-riesgo ${c.obligatoria ? "riesgo-bajo" : "riesgo-medio"}`}
                >
                  {c.obligatoria ? "Obligatorias" : "Opcionales"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-piedra-600">
                {c.descripcion}
              </p>
              <p className="mt-2 text-xs text-piedra-400">Ejemplos: {c.ejemplos}</p>
            </section>
          ))}
        </div>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-piedra-700">
          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              Cómo gestionarlas
            </h2>
            <p>
              Puedes borrar o bloquear cookies desde la configuración de tu navegador. Ten
              en cuenta que{" "}
              <strong>desactivar las esenciales impide usar el escaneo</strong>: sin ellas
              no podemos limitar los escaneos por IP y el servicio quedaría abierto a
              abuso.
            </p>
            <p className="mt-2">
              Harness la ferramenta{" "}
              <a
                href="https://www.youronlinechoices.com/"
                className="font-medium text-marca-600 underline underline-offset-2"
              >
                Your Online Choices
              </a>{" "}
              para gestionar las cookies de terceros en el EEE y Reino Unido.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              Sin banners que no sirven
            </h2>
            <p>
              No usamos cookies publicitarias ni de seguimiento de terceros por
              defecto. Si algún día activamos analítica o publicidad, lo activaremos con
              consentimiento previo y reversible.
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-piedra-200 pt-6 text-sm text-piedra-500">
          <p>
            <Link href="/aviso-legal" className="font-medium text-marca-600 underline underline-offset-2">
              Aviso legal
            </Link>{" "}
            ·{" "}
            <Link href="/privacidad" className="font-medium text-marca-600 underline underline-offset-2">
              Política de privacidad
            </Link>
          </p>
        </div>
      </article>
    </div>
  );
}