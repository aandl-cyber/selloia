import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: "Condiciones de uso, identificación del responsable y límites de responsabilidad de SelloIA.",
  alternates: { canonical: "/aviso-legal" },
  robots: { index: true, follow: true },
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

        <div className="mt-8 rounded-lg border border-riesgo-alto/25 bg-riesgo-alto-fondo p-5">
          <p className="text-sm leading-relaxed text-piedra-800">
            <strong className="text-riesgo-alto">Antes de nada, lo más importante.</strong>{" "}
            SelloIA es una <strong>herramienta técnica de verificación</strong>. No somos
            abogados ni damos asesoramiento jurídico. Los textos que generamos son
            <strong> plantillas informativas</strong>: te ayudan a saber qué mirar, no
            sustituyen el criterio de un profesional del derecho que conozca tu caso.
            Si una decisión puede costarte dinero, habla con alguien que pueda
            responder por ella.
          </p>
        </div>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-piedra-700">
          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              1. Identificación del servicio
            </h2>
            <p>
              SelloIA ofrece una herramienta web de análisis técnico que comprueba si un
              sitio web cumple las obligaciones de transparencia del Artículo 50 del
              Reglamento (UE) 2024/1689 (Reglamento Europeo de Inteligencia Artificial),
              exigibles desde el 2 de agosto de 2026.
            </p>
            <p className="mt-2">
              Para cualquier cuestión relacionada con el servicio, puedes escribir a{" "}
              <a href="mailto:hola@sello-ia.com" className="font-medium text-marca-600 underline underline-offset-2">
                hola@sello-ia.com
              </a>
              . En la factura se détail el titular del negocio, su NIF y su domicilio
              fiscal, que son los datos que exige la normativa fiscal española.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              2. Objeto y límites del servicio
            </h2>
            <p>
              El escaneo analiza únicamente el código HTML y los scripts{" "}
              <strong>públicamente accesibles</strong> de un dominio. No accedemos a
              ningún sistema, no entramos en áreas privadas y no hacemos pruebas de
              intrusión de ningún tipo.
            </p>
            <p className="mt-2">
              El servicio <strong>no puede ver</strong> lo que ocurre tras un inicio de
              sesión, en un panel de administración o dentro de una aplicación. Por eso
              el informe distingue siempre entre lo que ha podido comprobar y lo que no.
            </p>
            <p className="mt-2">
              Un resultado de SelloIA <strong>no constituye una certificación de
              cumplimiento</strong>, ni un informe pericial, ni el Dictamen de ninguna
              autoridad. Refleja el estado observable del sitio en el momento concreto del
              escaneo.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              3. Responsabilidad
            </h2>
            <p>
              Empreamos un esfuerzo razonable para que el análisis sea correcto, pero{" "}
              <strong>no garantizamos que sea completo ni que esté libre de errores</strong>
              . Los falsos positivos y falsos negativos son posibles: si detectamos un
              sistema que no está o no detectamos uno que sí, es un fallo de la
              herramienta.
            </p>
            <p className="mt-2">
              Si un escaneo erróneo te ha causado un perjuicio,{" "}
              <strong>escríbenos y te lo arreglamos o te devolvemos el dinero</strong>.
              Lo decimos aquí por escrito porque un producto nuevo no puede permitirse
              esconder sus fallos.
            </p>
            <p className="mt-2">
              SelloIA no se hace responsable de las decisiones que tomes a partir del
              informe, ni de las consecuencias de no realizar las correcciones que
              señalamos. El uso del servicio implica que has leído esta advertencia.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              4. Precios, pago y cancelación
            </h2>
            <p>
              Los precios se muestran con los impuestos aplicables incluidos. El pago se
              procesa a través de <strong>Stripe</strong>, que actúa como proveedor de
              pagos independiente. SelloIA{" "}
              <strong>no almacena los datos de tu tarjeta</strong>: no pasan por nuestros
              servidores.
            </p>
            <p className="mt-2">
              Las suscripciones se renuevan automáticamente por el periodo indicado en el
              momento de la contratación. Puedes cancelarlas desde el enlace que recibes
              por email o escribiendo a{" "}
              <a href="mailto:hola@sello-ia.com" className="font-medium text-marca-600 underline underline-offset-2">
                hola@sello-ia.com
              </a>
              . <strong>No hay permanencia ni penalización por cancelar.</strong>
            </p>
            <p className="mt-2">
              Las Acquits puntuales (Auditoría y Kit Agencias) incluyen 12 meses de
              servicio Pro y no son reembolsables una vez entregados, salvo defecto
              material del servicio.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              5. Propiedad intelectual
            </h2>
            <p>
              El software, las bases de datos de detección, el diseño y los textos de
              SelloIA son propiedad de sus titulares. Te otorgamos una licencia de uso no
              exclusiva, no transferible y limitada al uso contratado. El plan Agencias
              incluye derecho de uso del material en informes y materiales orientados a
              tus propios clientes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              6. Uso aceptable
            </h2>
            <p>Está prohibido usar SelloIA para:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Intentar acceder a los sistemas de terceros.</li>
              <li>Lanzar un volumen de escaneos que degrade el servicio para otros usuarios.</li>
              <li>Presentar el informe de SelloIA como si fuera un dictamen oficial.</li>
              <li>Reenviar nuestros textos legales sin modificar para lucrarse con ello.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              7. Legislación aplicable
            </h2>
            <p>
              Estos términos se rigen por la legislación española. Para cualquier
              controversia, las partes se someten a los juzgados y tribunales que resulten
              competentes conforme a la normativa aplicable, respetando en todo caso el
              fuero que corresponda a las personas consumidoras.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              8. Cambios
            </h2>
            <p>
              Podemos actualizar estas condiciones. Los cambios sustanciales se
              anunciarán en esta página con al menos 30 días de antelación y, cuando
              afecten a un servicio contratado, se comunicarán por email.
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-piedra-200 pt-6 text-sm text-piedra-500">
          <p>
            ¿Has encontrado algo ambiguo o incorrecto en estas condiciones?{" "}
            <Link href="/privacidad" className="font-medium text-marca-600 underline underline-offset-2">
              Política de privacidad
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