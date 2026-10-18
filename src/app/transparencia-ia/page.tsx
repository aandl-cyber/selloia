import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Transparencia en el uso de inteligencia artificial",
  description:
    "Qué sistemas de inteligencia artificial utiliza SelloIA, con qué fines y cómo se identifican sus salidas. Conforme al Artículo 50 del Reglamento (UE) 2024/1689.",
  alternates: { canonical: "/transparencia-ia" },
  openGraph: {
    title: "Transparencia en IA · SelloIA",
    description:
      "SelloIA usa inteligencia artificial para analizar webs. Esta página dice exactamente cómo y en qué condiciones.",
    url: "https://sello-ia.com/transparencia-ia",
  },
};

const F = "2026-10-18";

const SISTEMAS = [
  {
    nombre: "Clasificación de contenido",
    uso: "Analizar el HTML público de tu web para detectar sistemas de IA.",
    base: "Cada escaneo se ejecuta desde cero. No almacenamos tu HTML ni.train ningún modelo con él.",
  },
  {
    nombre: "Redacción de los textos legales",
    uso: "Generar avisos, páginas de transparencia y marcado técnico a partir de plantillas fijas.",
    base: "Las plantillas están escritas y revisadas por una persona. La IA no redacta textos legales: los rellena con tus datos.",
  },
  {
    nombre: "Clasificación de riesgo",
    uso: "Calcular una puntuación de 0 a 100 según los hallazgos técnicos detectados.",
    base: "Regla de puntuación fija y documentada. Puedes reproducirla leyendo el informe.",
  },
];

const NO_HACEMOS = [
  "Entrenar modelos con las webs que escaneamos",
  "Vender, compartir o ceder los datos de tus escaneos a terceros",
  "Usar tu web con fines de publicidad o prospección",
  "Enviar emails a empresas que no nos los hayan pedido",
  "Tomar decisiones sobre personas mediante sistemas automatizados",
];

export default function TransparenciaIA() {
  return (
    <div className="contenedor py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="tarjeta overflow-hidden">
          <div className="border-b border-piedra-200 bg-piedra-100 px-6 py-5 md:px-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-riesgo-bajo-fondo px-3 py-1 text-xs font-semibold text-riesgo-ok">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-riesgo-ok" />
              Libro, sin excusas
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold text-piedra-900 md:text-4xl">
              Transparencia en el uso de inteligencia artificial
            </h1>
            <p className="mt-3 text-sm text-piedra-500">
              Última actualización: <time dateTime={F}>18 de octubre de 2026</time>
            </p>
          </div>

          <div className="space-y-8 px-6 py-7 md:px-8 md:py-9">
            <p className="leading-relaxed text-piedra-700">
              Si estás leyendo esto, probablemente estás pensando en que otras empresas
              te expliquen qué IA usan. Estado:{" "}
              <strong className="font-semibold text-piedra-900">
                SelloIA está construida con inteligencia artificial
              </strong>{" "}
              y esta es la respuesta completa, con nombre y apellidos.
            </p>

            <p className="leading-relaxed text-piedra-700">
              Escribimos esta página porque no tenerla es exactamente el problema que
              denunciamos. Si el Art. 50 del Reglamento (UE) 2024/1689 puede exigirse
              desde el 2 de agosto de 2026, empezar por el propio sitio con un 404 es
              un mal comienzo.
            </p>

            <section>
              <h2 className="font-display text-xl font-semibold text-piedra-900">
                Sistemas que usamos
              </h2>
              <div className="mt-4 space-y-3">
                {SISTEMAS.map((s) => (
                  <div key={s.nombre} className="rounded-lg border border-piedra-200 p-4">
                    <h3 className="text-sm font-semibold text-piedra-900">{s.nombre}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-piedra-600">
                      <strong className="font-medium">Para qué:</strong> {s.uso}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-piedra-600">
                      <strong className="font-medium">Con qué base:</strong> {s.base}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-piedra-900">
                Lo que no hacemos
              </h2>
              <ul className="mt-4 space-y-2.5">
                {NO_HACEMOS.map((n) => (
                  <li key={n} className="flex gap-2.5 text-sm leading-relaxed text-piedra-700">
                    <span aria-hidden="true" className="mt-0.5 shrink-0 font-bold text-riesgo-critico">
                      ×
                    </span>
                    {n}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-piedra-900">
                Sobre tus datos
              </h2>
              <p className="mt-3 leading-relaxed text-piedra-700">
                Cuando escaneas una web, SelloIA{" "}
                <strong className="font-semibold">no guarda el HTML analizado</strong>.
                De los escaneos conservamos únicamente: dominio, fecha, puntuación y la
                lista de sistemas detectados, y solo si has iniciado sesión en un plan de
                pago. En el escaneo gratuito no almacenamos nada.
              </p>
              <p className="mt-3 leading-relaxed text-piedra-700">
                Si nos facilitas tu email para "vigilar tu web", guardamos{" "}
                <strong className="font-semibold">solo el dominio</strong> y esa
                dirección. Nunca los escaneamos con fines comerciales.
              </p>
              <p className="mt-3 leading-relaxed text-piedra-700">
                Detalles completos en la{" "}
                <Link href="/privacidad" className="font-medium text-marca-600 underline underline-offset-2">
                  política de privacidad
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold text-piedra-900">
                Contenido de esta página
              </h2>
              <p className="mt-3 leading-relaxed text-piedra-700">
                Este texto ha sido{" "}
                <strong className="font-semibold">redactado y revisado por una persona</strong>.
                Se usó IA como apoyo de investigación, no como autor. No hay contenido
                generado por IA sin revisar en este sitio.
              </p>
              <p className="mt-2 text-xs text-piedra-500">
                <code>data-ai-review="human"</code>
              </p>
            </section>

            <section className="rounded-lg border border-piedra-200 bg-piedra-100 p-5">
              <h2 className="font-display text-base font-semibold text-piedra-900">
                Contacto
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-piedra-700">
                Para cualquier cuestión sobre esta página o sobre el uso de IA en
                SelloIA:{" "}
                <a
                  href="mailto:hola@sello-ia.com"
                  className="font-medium text-marca-600 underline underline-offset-2"
                >
                  hola@sello-ia.com
                </a>
                . Contestamos en menos de 4 horas laborables.
              </p>
            </section>

            <p className="text-xs leading-relaxed text-piedra-500">
              Fundamento: Artículo 50 del Reglamento (UE) 2024/1689, exigible desde el 2 de
              agosto de 2026, y principios de transparencia del RGPD. Esta página{" "}
              <strong className="font-semibold">no constituye asesoramiento jurídico</strong>.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-riesgo-medio/20 bg-riesgo-medio-fondo p-4">
          <p className="text-xs leading-relaxed text-piedra-700">
            <strong>¿Tu web tiene lo mismo?</strong> El 90 % de los sitios que escaneamos
            detectan al menos un sistema de IA sin el aviso que exige el Art. 50.1.
            Compruébalo en 60 segundos:{" "}
            <Link href="/#escanner" className="font-medium underline underline-offset-2">
              escaneo gratuito
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}