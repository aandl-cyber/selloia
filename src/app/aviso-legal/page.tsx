import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso legal",
  description:
    "A & L Marketing Ltd, titular de SelloIA. Datos de identificación, condiciones de uso, precios, pago y límites de responsabilidad.",
  alternates: { canonical: "/aviso-legal" },
};

export default function AvisoLegal() {
  return (
    <div className="contenedor py-16 md:py-20">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-piedra-900">
          Aviso legal
        </h1>
        <p className="mt-3 text-sm text-piedra-500">
          Última actualización: <time dateTime="2026-10-18">18 de octubre de 2026</time>
        </p>

        {/* Identificación del responsable */}
        <section className="tarjeta mt-8 p-6">
          <h2 className="font-display text-lg font-semibold text-piedra-900">
            Identificación del titular
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2 border-b border-piedra-100 pb-2">
              <dt className="text-piedra-500">Denominación social</dt>
              <dd className="font-semibold text-piedra-900">A &amp; L Marketing Ltd</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-piedra-100 pb-2">
              <dt className="text-piedra-500">Domicilio social</dt>
              <dd className="font-semibold text-piedra-900">
                2 Frederick Street, Kings Cross, London, United Kingdom, WC1X 0ND
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-piedra-100 pb-2">
              <dt className="text-piedra-500">Teléfono</dt>
              <dd className="font-semibold text-piedra-900">+44 7462 154275</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-piedra-100 pb-2">
              <dt className="text-piedra-500">Correo electrónico</dt>
              <dd className="font-semibold text-piedra-900">
                <a href="mailto:hola@sello-ia.com" className="text-marca-600 underline underline-offset-2">
                  hola@sello-ia.com
                </a>
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-piedra-500">Número de sociedad (Companies House)</dt>
              <dd className="font-semibold text-riesgo-critico">
                Pendiente de añadir
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-piedra-500">
            El número de registro en Companies House es un dato que la legislación
            británica obliga a indicar. Se incorpora en cuanto nos lo confirmes.
          </p>
        </section>

        {/* Aviso de no asesoramiento */}
        <div className="mt-6 rounded-lg border border-riesgo-alto/25 bg-riesgo-alto-fondo p-5">
          <p className="text-sm leading-relaxed text-piedra-800">
            <strong className="text-riesgo-alto">Lo primero, y lo más importante.</strong>{" "}
            SelloIA es una <strong>herramienta técnica de verificación</strong>. No somos
            abogados y no damos asesoramiento jurídico. Los textos que generamos son{" "}
            <strong>plantillas informativas</strong>: te ayudan a saber qué mirar, no
            sustituyen el criterio de un profesional con título y seguro de
            responsabilidad civil. Si una decisión puede costarte dinero, habla con
            alguien que pueda responder por ella.
          </p>
        </div>

        {/* IVA y fiscalidad */}
        <div className="mt-4 rounded-lg border border-riesgo-medio/30 bg-riesgo-medio-fondo p-5">
          <h3 className="text-sm font-semibold text-piedra-900">
            Fiscalidad, IVA y precios
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-piedra-800">
            SelloIA es propiedad de una sociedad del Reino Unido y cobra a clientes en
            todo el Espacio Económico Europeo.{" "}
            <strong>
              Los precios mostrados no incluyen el IVA que corresponda en tu país
            </strong>
            , que se aplica y se liquida conforme a las obligaciones fiscales
            correspondientes. En la factura constarán los datos fiscales del cliente y
            el tratamiento fiscal aplicado.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-piedra-800">
            Esto afecta también a ti como cliente: si compraste pensando que el precio
            incluía IVA, dínoslo y te lo regularizamos sin discusión.
          </p>
        </div>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-piedra-700">
          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              1. Objeto del servicio
            </h2>
            <p>
              SelloIA analiza el código HTML y los scripts{" "}
              <strong>públicamente accesibles</strong> de un dominio para comprobar si
              cumple las obligaciones de transparencia del Artículo 50 del Reglamento (UE)
              2024/1689, exigibles desde el 2 de agosto de 2026.
            </p>
            <p className="mt-2">
              No accedemos a ningún sistema, no entramos en áreas privadas y no hacemos
              pruebas de intrusión. El servicio{" "}
              <strong>no puede ver</strong> lo que ocurre tras un inicio de sesión o
              dentro de una aplicación. Por eso el informe distingue siempre entre lo que
              ha podido comprobar y lo que no.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              2. Naturaleza del informe
            </h2>
            <p>
              Un resultado de SelloIA{" "}
              <strong>
                no es una certificación de cumplimiento, ni un informe pericial, ni el
                dictamen de ninguna autoridad
              </strong>
              . Refleja el estado observable del sitio en el momento concreto del escaneo.
            </p>
            <p className="mt-2">
              Empleamos un esfuerzo razonable para que el análisis sea correcto, pero{" "}
              <strong>no garantizamos que sea completo ni que esté libre de errores</strong>
              . Los falsos positivos y negativos son posibles. Si un escaneo erróneo te
              ha causado un perjuicio,{" "}
              <strong>escríbenos y lo arreglamos o te devolvemos el dinero</strong>: lo
              decimos por escrito porque un producto nuevo no puede permitirse ocultar
              sus fallos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              3. Precios, pago y cancelación
            </h2>
            <p>
              El pago se procesa a través de <strong>Stripe</strong>, proveedor de pagos
              independiente. SelloIA <strong>no almacena datos de tarjeta</strong>: no
              pasan por nuestros servidores.
            </p>
            <p className="mt-2">
              Las suscripciones se renuevan automáticamente por el periodo indicado.
              Puedes cancelarlas desde el enlace del email de confirmación o escribiendo a{" "}
              <a href="mailto:hola@sello-ia.com" className="font-medium text-marca-600 underline underline-offset-2">
                hola@sello-ia.com
              </a>
              . <strong>No hay permanencia ni penalización por cancelar.</strong>
            </p>
            <p className="mt-2">
              Auditoría y Kit Agencias son pago único e incluyen 12 meses de servicio
              Pro. No son reembolsables una vez entregados, salvo defecto material.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              4. Propiedad intelectual
            </h2>
            <p>
              El software, la base de datos de firmas de detección, el diseño y los
              textos son propiedad de A &amp; L Marketing Ltd. Te otorgamos licencia de
              uso no exclusiva, no transferible y limitada al uso contratado. El plan
              Agencias incluye derecho a usar el material en informes y materiales
              destinados a tus propios clientes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              5. Uso aceptable
            </h2>
            <p>Está prohibido usar SelloIA para:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Intentar acceder a los sistemas de terceros.</li>
              <li>
                Generar un volumen de escaneos que degrade el servicio para otros
                usuarios.
              </li>
              <li>Presentar el informe como si fuera un dictamen oficial.</li>
              <li>Revender nuestros textos legales sin modificar.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              6. Legislación aplicable
            </h2>
            <p>
              Estos términos se rigen por la legislación del Reino Unido, sin perjuicio
              de los derechos imperativos que correspondan si el cliente es consumidor o
              reside en otro Estado miembro del EEE. Para cualquier controversia se
              someten las partes a los tribunales competentes de{" "}
              <strong>London, England</strong>, respetando en todo caso el fuero
              testimonial o imperativo que la normativa aplicable reconozca al
              consumidor.
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-piedra-200 pt-6 text-sm text-piedra-500">
          <p>
            <Link href="/privacidad" className="font-medium text-marca-600 underline underline-offset-2">
              Política de privacidad
            </Link>{" "}
            ·{" "}
            <Link href="/cookies" className="font-medium text-marca-600 underline underline-offset-2">
              Política de cookies
            </Link>{" "}
            ·{" "}
            <Link href="/transparencia-ia" className="font-medium text-marca-600 underline underline-offset-2">
              Transparencia en IA
            </Link>
          </p>
        </div>
      </article>
    </div>
  );
}