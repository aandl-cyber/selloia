import Link from "next/link";
import Escanner from "@/components/escanner";

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "SelloIA",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "es-ES",
      url: "https://sello-ia.com",
      description:
        "Escáner de cumplimiento del Artículo 50 del Reglamento (UE) 2024/1689 para webs con inteligencia artificial.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        description: "Escaneo gratuito de un dominio",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "1",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "¿Desde cuándo es obligatorio informar de que uso IA en mi web?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Desde el 2 de agosto de 2026. El Artículo 50 del Reglamento Europeo de Inteligencia Artificial pasó a ser exigible en esa fecha y no fue retrasado por el Omnibus Digital, que solo aplazó las obligaciones de los sistemas de alto riesgo a diciembre de 2027 y agosto de 2028.",
          },
        },
        {
          "@type": "Question",
          name: "¿Qué multa me pueden poner por no avisar de que uso un chatbot?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "El Artículo 99 del Reglamento prevé multas de hasta 15 millones de euros o el 3 % de la facturación anual global para el incumplimiento de las obligaciones de transparencia del Artículo 50. Para pymes se aplica el importe menor entre la cuantía fija y el porcentaje.",
          },
        },
        {
          "@type": "Question",
          name: "¿Tengo que avisar si solo uso ChatGPT para escribir emails a mi equipo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Para uso interno no se aplica el Artículo 50, que regula la interacción con personas físicas y la publicación de contenido. Pero sí es exigible el Artículo 4: las medidas de alfabetización en IA para el personal que use estas herramientas, en vigor desde el 2 de febrero de 2025.",
          },
        },
        {
          "@type": "Question",
          name: "¿Basta con poner un aviso en el pie de la web?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. El Artículo 50.1 exige informar antes o en el momento en que se inicia la interacción. Un aviso en el pie de página o escondido en las cookies no cumple. Además, el Artículo 50.2 exige un marcado legible por máquina distinto del aviso visible.",
          },
        },
      ],
    },
  ],
};

const COMPROBACIONES = [
  {
    art: "50.1",
    titulo: "Aviso de que estás hablando con una IA",
    texto:
      "Si tu web tiene un chatbot, un avatar o un asistente de voz, la persona tiene que saberlo en el momento en que empieza la conversación. No vale con esconderlo en las cookies.",
  },
  {
    art: "50.2",
    titulo: "Marcado legible por máquina",
    texto:
      "Las salidas de sistemas generativos deben llevar un marcado técnico que permita detectar su origen sintético. Es una obligación distinta del aviso visible, y casi nadie la cumple.",
  },
  {
    art: "50.4",
    titulo: "Etiquetado del contenido publicado",
    texto:
      "Si publicas textos, imágenes, audio o vídeo hechos con IA, tienes que identificarlo de forma visible junto al contenido. El marcado no sustituye a esta información.",
  },
  {
    art: "4",
    titulo: "Formación de tu equipo en IA",
    texto:
      "Exigible desde el 2 de febrero de 2025 y el único que no se ve desde fuera. Si nadie puede demostrar que su personal sabe usar IA de forma responsable, tienes un hueco documentado.",
  },
];

const PASOS = [
  {
    n: "01",
    t: "Escaneamos tu web",
    d: "Crawleamos tu portada y las páginas internas donde suele haber IA: blog, soporte, contacto. Identificamos más de 30 tipos de sistemas: Intercom, Tidio, Crisp, Zendesk, Botpress, Dify, ElevenLabs, Synthesia y más.",
  },
  {
    n: "02",
    t: "Tú ves los fallos",
    d: "Cada hallazgo lleva su evidencia real: qué sistema hemos detectado, en qué página y con qué firma. Nada de checklists genéricos. Si es falso positivo, lo descartamos y te lo decimos.",
  },
  {
    n: "03",
    t: "Pegas y listo",
    d: "Te damos el aviso, la página de transparencia y el marcado técnico ya redactados en español. Copias, pegas, y el incumplimiento desaparece. Sin attorney's fees.",
  },
];

const PREGUNTAS = [
  {
    q: "¿Esto es asesoramiento jurídico?",
    a: "No. SelloIA verifica técnicamente lo que se puede verificar desde fuera y te da plantillas informativas. Tus obligaciones concretas dependen de tu situación, y una autoridad competente puede interpretarlas de otra manera. Para decisiones con consecuencias, habla con un profesional del derecho.",
  },
  {
    q: "¿Y si mi web no usa IA?",
    a: "Entonces el escaneo te lo dirá en 60 segundos y no tendrás que pagar nada. Pero ojo: el Artículo 4 (formación del equipo) sigue siendo exigible desde febrero de 2025 aunque no haya nada visible en la web.",
  },
  {
    q: "¿Qué pasa si tengo varios dominios?",
    a: "El plan Agencias cubre los que necesites y genera un informe vendible por cliente, con tu marca en lugar de la nuestra. Precio cerrado, sin sorpresas.",
  },
  {
    q: "¿Detectáis los chatbots que se cargan al hacer scroll?",
    a: "Analizamos el HTML y los scripts declarados. Algunos widgets muy dinámicos que no aparecen en el código fuente no se detectan: por eso el plan Pro repite el escaneo cada mes y te avisa cuando algo cambia.",
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
      />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-piedra-200">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-piedra-300 to-transparent"
        />
        <div className="contenedor py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-riesgo-critico/25 bg-riesgo-critico-fondo px-3 py-1 text-xs font-semibold text-riesgo-critico">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-riesgo-critico" />
              Exigible desde el 2 de agosto de 2026
            </span>

            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight text-piedra-900 sm:text-5xl md:text-6xl">
              Tu web usa IA
              <br />
              y no lo dice.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-piedra-600">
              Desde el 2 de agosto de 2026, el{" "}
              <strong className="font-semibold text-piedra-900">
                Artículo 50 del Reglamento Europeo de IA
              </strong>{" "}
              es exigible. Si tu visitante no sabe que está hablando con un bot, estás
              incumpliendo. La sanción puede llegar al{" "}
              <strong className="font-semibold text-piedra-900">
                3 % de tu facturación
              </strong>
              .
            </p>
          </div>

          <div id="escanner" className="mx-auto mt-10 max-w-2xl scroll-mt-20">
            <div className="tarjeta p-5 shadow-lg shadow-piedra-900/5 sm:p-6">
              <Escanner />
            </div>
            <p className="mt-4 text-center text-xs text-piedra-400">
              Escaneo técnico automatizado. No sustituye al análisis de un profesional.
            </p>
          </div>
        </div>
      </section>

      {/* ── EL PROBLEMA ──────────────────────────────────────────────────── */}
      <section className="contenedor py-16 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_1.15fr] md:items-center md:gap-16">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight text-piedra-900">
              No es un problema de tecnología. Es un problema de demuestra(r).
            </h2>
            <p className="mt-4 leading-relaxed text-piedra-600">
              Casi ninguna empresa incumplió el Artículo 50 por usar IA. Incumplió porque
              no tenía forma de <em>demostrar</em> que cumplía. Y cuando una autoridad te
              pide la prueba, el sistema que nadie documentó deja de importar.
            </p>
            <p className="mt-4 leading-relaxed text-piedra-600">
              SelloIA construye esa prueba automáticamente. La revisas hoy, y dentro de seis
              meses te sigue diciendo la verdad.
            </p>
          </div>

          <div className="tarjeta divide-y divide-piedra-100 overflow-hidden">
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-piedra-400">
                Sin SelloIA
              </p>
              <p className="mt-2 text-sm leading-relaxed text-piedra-600">
                El aviso estaba en el panel de control del proveedor. Luego actualizaron el
                tema, el CSS lo tapó en móvil y nadie se dio cuenta durante cuatro meses.
              </p>
            </div>
            <div className="bg-riesgo-bajo-fondo/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-riesgo-ok">
                Con SelloIA
              </p>
              <p className="mt-2 text-sm leading-relaxed text-piedra-700">
                Revisión mensual automática. Te avisamos el día que el aviso desaparece, el
                día que montan un chatbot nuevo, o el día que publicas contenido sintético
                sin etiquetar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUÉ COMPROBAMOS ──────────────────────────────────────────────── */}
      <section className="border-y border-piedra-200 bg-white py-16 md:py-20">
        <div className="contenedor">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-piedra-900 md:text-4xl">
              Cuatro obligaciones. Solo una se ve en tu web.
            </h2>
            <p className="mt-4 text-lg text-piedra-600">
              Las comprobamos todas, aunque las tres últimas no se puedan ver desde fuera.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {COMPROBACIONES.map((c) => (
              <article key={c.art} className="tarjeta p-6">
                <span className="font-mono text-xs font-bold text-marca-600">
                  Art. {c.art}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold text-piedra-900">
                  {c.titulo}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-piedra-600">{c.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────────────────────── */}
      <section className="contenedor py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-piedra-900 md:text-4xl">
            De la duda al cumplimiento en 60 segundos
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PASOS.map((p) => (
            <div key={p.n} className="relative">
              {/* Antes iba en piedra-200 (1.2:1 sobre el fondo): ilegible incluso siendo
                  un número decorativo de 36px, que exige 3:1. */}
              <span className="font-mono text-4xl font-bold text-piedra-400">{p.n}</span>
              <h3 className="mt-2 font-display text-lg font-semibold text-piedra-900">
                {p.t}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-piedra-600">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-piedra-200 bg-piedra-900 py-16">
        <div className="contenedor text-center">
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
            Empieza por saber si tienes un problema
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-piedra-300">
            El escaneo es gratis y no te compromete a nada. Pero si hay algo que arreglar,
            lo sabes antes de que te lo pregunten.
          </p>
          <a href="#escanner" className="boton boton-acento mt-8 px-6 py-3">
            Escanear mi web ahora
          </a>
        </div>
      </section>

      {/* ── PRECIOS ──────────────────────────────────────────────────────── */}
      <section id="precios" className="contenedor py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-piedra-900 md:text-4xl">
            Precios
          </h2>
          <p className="mt-4 text-lg text-piedra-600">
            Sin permanencia. Sin sorpresas. Cancela cuando quieras.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {[
            {
              nombre: "Escaneo",
              precio: "Gratis",
              nota: "Un dominio, una vez",
              items: [
                "Escaneo completo del Art. 50",
                "Sistemas de IA detectados",
                "Evidencia por hallazgo",
                "Textos legales para copiar",
              ],
              cta: "Empezar",
              href: "#escanner",
              destacado: false,
            },
            {
              nombre: "Pro",
              precio: "19 €",
              nota: "al mes, por dominio",
              items: [
                "Todo lo del escaneo",
                "Reescaneo automático cada 30 días",
                "Alertas si el aviso desaparece",
                "SelloIA con página verificable",
                "Widget de aviso listo",
              ],
              cta: "Empezar con Pro",
              href: "/precios",
              destacado: false,
            },
            {
              nombre: "Auditoría",
              precio: "199 €",
              nota: "pago único",
              items: [
                "Todo lo de Pro durante 12 meses",
                "Informe firmado y exportable",
                "Instalamos los avisos por ti",
                "Revisión de tu política interna",
              ],
              cta: "Pedir auditoría",
              href: "/precios",
              destacado: false,
            },
            {
              nombre: "Agencias",
              precio: "499 €",
              nota: "pago único, marca blanca",
              items: [
                "SelloIA en tu marca, sin nuestro nombre",
                "Informe vendible por cliente",
                "Kit de formación Art. 4 y 26",
                "Textos legales reutilizables",
                "Soporte prioritario",
              ],
              cta: "Hablar de agencias",
              href: "/precios",
              destacado: true,
            },
          ].map((p) => (
            <div
              key={p.nombre}
              className={`tarjeta flex flex-col p-6 ${
                p.destacado ? "ring-2 ring-piedra-900" : ""
              }`}
            >
              {p.destacado && (
                <span className="mb-3 w-fit rounded-full bg-piedra-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Recomendado
                </span>
              )}
              <h3 className="font-display text-lg font-semibold text-piedra-900">
                {p.nombre}
              </h3>
              <p className="mt-3 font-display text-4xl font-bold text-piedra-900">
                {p.precio}
              </p>
              <p className="mt-1 text-sm text-piedra-500">{p.nota}</p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-piedra-600">
                    <span aria-hidden="true" className="mt-0.5 shrink-0 text-riesgo-ok">
                      ✓
                    </span>
                    {i}
                  </li>
                ))}
              </ul>

              <Link
                href={p.href}
                className={`boton mt-6 w-full ${p.destacado ? "boton-primario" : "boton-secundario"}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-piedra-400">
          Precios sin IVA. consultar{" "}
          <Link href="/aviso-legal" className="underline underline-offset-2">
            aviso legal
          </Link>{" "}
          y{" "}
          <Link href="/privacidad" className="underline underline-offset-2">
            política de privacidad
          </Link>
          .
        </p>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-piedra-200 bg-white py-16 md:py-20">
        <div className="contenedor max-w-3xl">
          <h2 className="text-center font-display text-3xl font-bold text-piedra-900">
            Preguntas frecuentes
          </h2>
          <div className="mt-10 space-y-3">
            {PREGUNTAS.map((p) => (
              <details key={p.q} className="tarjeta group p-5">
                <summary className="cursor-pointer list-none text-sm font-semibold text-piedra-900 marker:hidden">
                  <span className="flex items-start justify-between gap-4">
                    {p.q}
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-piedra-400 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-piedra-600">{p.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}