import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos recoge SelloIA, con qué base legal los trata, cuánto tiempo los conserva y qué derechos puedes ejercer. RGPD y UK GDPR.",
  alternates: { canonical: "/privacidad" },
};

export default function Privacidad() {
  return (
    <div className="contenedor py-16 md:py-20">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-piedra-900">
          Política de privacidad
        </h1>
        <p className="mt-3 text-sm text-piedra-500">
          Última actualización: <time dateTime="2026-10-18">18 de octubre de 2026</time>
        </p>

        <section className="tarjeta mt-8 p-6">
          <h2 className="font-display text-lg font-semibold text-piedra-900">
            Responsable del tratamiento
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-piedra-700">
            <strong className="text-piedra-900">A &amp; L Marketing Ltd</strong>
            <br />
            Empresa registrada en Inglaterra y Gales con el número{" "}
            <a
              href="https://find-and-update.company-information.service.gov.uk/company/15185033"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-marca-600 underline underline-offset-2"
            >
              15185033
            </a>
            , constituida el 3 de octubre de 2023.
            <br />
            2 Frederick Street, Kings Cross, London, United Kingdom, WC1X 0ND
            <br />
            Teléfono:{" "}
            <a href="tel:+447462154275" className="text-marca-600 underline underline-offset-2">
              +44 7462 154275
            </a>
            <br />
            Email:{" "}
            <a href="mailto:hola@sello-ia.com" className="font-medium text-marca-600 underline underline-offset-2">
              hola@sello-ia.com
            </a>
          </p>
          <p className="mt-3 text-xs leading-relaxed text-piedra-500">
            A &amp; L Marketing Ltd es el responsable del tratamiento en el sentido del
            RGPD y del UK GDPR. SelloIA es una marca comercial de esa sociedad.
          </p>
        </section>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-piedra-700">
          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              1. Resumen en una frase
            </h2>
            <p>
              Cuando usas el escaneo gratuito,{" "}
              <strong>no guardamos casi nada</strong>. Cuando contratas, guardamos tu
              email y los resultados de tus escaneos. Nada más.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              2. Datos tratados, base legal y conservación
            </h2>

            <div className="tarjeta mt-4 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-piedra-200 bg-piedra-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-piedra-900">Dato</th>
                    <th className="px-4 py-3 font-semibold text-piedra-900">Base legal</th>
                    <th className="px-4 py-3 font-semibold text-piedra-900">Conservación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-piedra-100">
                  <tr>
                    <td className="px-4 py-3">
                      Dirección IP (escaneo gratuito)
                    </td>
                    <td className="px-4 py-3">Interés legítimo: seguridad</td>
                    <td className="px-4 py-3">Solo en memoria, se pierde al reiniciar</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Email + dominio (vigilancia)</td>
                    <td className="px-4 py-3">Consentimiento</td>
                    <td className="px-4 py-3">Hasta que te des de baja</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      Datos de facturación y pago
                    </td>
                    <td className="px-4 py-3">Obligación legal y contractual</td>
                    <td className="px-4 py-3">10 años (normativa HMRC)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Historial de escaneos (clientes de pago)</td>
                    <td className="px-4 py-3">Ejecución del contrato</td>
                    <td className="px-4 py-3">Mientras dure la relación</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4">
              <strong className="text-piedra-900">No almacenamos el HTML de tu web.</strong>{" "}
              Se analiza en memoria y se descarta. Del escaneo conservamos, como mucho:
              dominio, fecha, puntuación y lista de sistemas detectados — y{" "}
              <strong>solo si has contratado</strong>. En el plan gratuito no guardamos
              ningún resultado.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              3. Encargados de tratamiento
            </h2>
            <ul className="mt-3 space-y-2">
              <li>
                <strong>Vercel Inc.</strong> — alojamiento e infraestructura (EE. UU.)
              </li>
              <li>
                <strong>Stripe Payments Europe Ltd.</strong> — pasarela de pago (Irlanda /
                EEA)
              </li>
              <li>
                <strong>Resend, Inc.</strong> — envío de emails (EE. UU.)
              </li>
              <li>
                <strong>GitHub, Inc.</strong> — repositorio de código (EE. UU.)
              </li>
            </ul>
            <p className="mt-3">
              Los tres últimos pueden tratar datos fuera del EEE. Aplicamos las{" "}
              <strong>cláusulas contractuales tipo de la Comisión Europea</strong> y, en
              el caso de EE. UU., el marco de protección de datos aplicable.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              4. Tus derechos
            </h2>
            <p>
              Puedes ejercer en cualquier momento el acceso, rectificación, supresión,
              oposición, limitación y portabilidad escribiendo a{" "}
              <a href="mailto:hola@sello-ia.com" className="font-medium text-marca-600 underline underline-offset-2">
                hola@sello-ia.com
              </a>
              . Respondemos en un máximo de 30 días.
            </p>
            <p className="mt-2">
              Si consideras que no hemos atendido correctamente tu solicitud, puedes
              reclamar ante la <strong>ICO</strong> (Information Commissioner&apos;s
              Office, Reino Unido) o ante la Agencia Española de Protección de Datos.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-piedra-900">
              5. Seguridad
            </h2>
            <p>
              HTTPS con TLS en todo el tráfico. Los datos de tarjeta{" "}
              <strong>nunca pasan por nuestros servidores</strong>: los gestiona Stripe.
              Todos los accesos de administración usan autenticación de doble factor.
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-piedra-200 pt-6 text-sm text-piedra-500">
          <p>
            <Link href="/aviso-legal" className="font-medium text-marca-600 underline underline-offset-2">
              Aviso legal
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