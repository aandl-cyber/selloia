import type { Metadata } from "next";
import Link from "next/link";
import BotonPago from "@/components/boton-pago";
import type { PlanId } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Escaneo gratuito, SelloIA Pro a 19,99 €/mes, auditoría puntual a 199 € y Kit Agencias a 499 € con marca blanca. Sin permanencia.",
  alternates: { canonical: "/precios" },
  openGraph: {
    title: "Precios · SelloIA",
    description: "Sin permanencia. Cancela cuando quieras.",
    url: "https://sello-ia.com/precios",
  },
};

const PLANES: {
  id: PlanId;
  nombre: string;
  precio: string;
  periodo: string;
  resumen: string;
  items: string[];
  destacado: boolean;
}[] = [
  {
    id: "pro",
    nombre: "Pro",
    precio: "19,99 €",
    periodo: "al mes, por dominio. Cancela cuando quieras.",
    resumen: "Para quien tiene un chatbot y quiere que no se rompa.",
    items: [
      "Escaneo completo cada 30 días",
      "Alerta el día que el aviso de IA desaparece",
      "Alerta cuando montas un sistema nuevo",
      "SelloIA con página de verificación pública",
      "Widget de aviso listo para pegar",
    ],
    destacado: true,
  },
  {
    id: "auditoria",
    nombre: "Auditoría",
    precio: "199 €",
    periodo: "pago único",
    resumen: "Para quien quiere dejar el problema resuelto y que no vuelva.",
    items: [
      "Todo lo de Pro durante 12 meses",
      "Informe firmado, exportable en PDF",
      "Instalamos los avisos y la página de transparencia",
      "Revisión de tu política interna de IA",
      "Canal directo por email",
    ],
    destacado: false,
  },
  {
    id: "agencias",
    nombre: "Agencias",
    precio: "499 €",
    periodo: "pago único, marca blanca",
    resumen: "Para quien vende webs a otros y hereda sus problemas.",
    items: [
      "SelloIA en tu marca, sin nuestro nombre",
      "Informe vendible a tu cliente final",
      "Kit de formación Art. 4 y Art. 26",
      "Textos legales reutilizables y editables",
      "Soporte prioritario por WhatsApp",
      "White-label: tu logo, tus colores",
    ],
    destacado: false,
  },
];

export default function Precios() {
  return (
    <div className="contenedor py-16 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight text-piedra-900 md:text-5xl">
          Precios
        </h1>
        <p className="mt-4 text-lg text-piedra-600">
          El escaneo siempre es gratis. Pagas cuando quieres que no se te rompa, o
          cuando necesitas el trabajo hecho.
        </p>
        <p className="mt-3 rounded-lg border border-piedra-200 bg-white px-4 py-3 text-sm text-piedra-600">
          <strong className="text-piedra-900">El importe que ves es el importe que pagas.</strong>{" "}
          No a&#241;adimos impuestos en el momento de la compra. Operamos desde Reino Unido sin n&uacute;mero de IVA
          europeo, as&iacute; que el precio mostrado es{" "}
          <strong>el precio final</strong> y no ver&aacute;s ning&uacute;n desglose al finalizar. A &amp; L
          Marketing Ltd asume el tratamiento fiscal que le corresponda sobre sus ingresos.
        </p>
      </div>

      {/* Guía de decisión: la pregunta real no es "qué plan", es "cuál necesito" */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-center font-display text-2xl font-bold text-piedra-900">
          ¿Cuál necesito? Decide en diez segundos
        </h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              s: "No tengo chatbot en la web",
              r: "Empieza por el escaneo gratuito. Si sale limpio, no pagas nada.",
            },
            {
              s: "Tengo chatbot y quiero que no se rompa",
              r: "Pro. 19,99 € al mes y te avisamos el día que el aviso desaparezca.",
            },
            {
              s: "Vendo webs a otros",
              r: "Kit Agencias. Marca blanca e informe que puedes entregar a tu cliente.",
            },
          ].map((g) => (
            <div key={g.s} className="tarjeta p-5">
              <dt className="text-sm font-semibold text-piedra-900">{g.s}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-piedra-600">{g.r}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
        {PLANES.map((p) => (
          <div
            key={p.id}
            className={`tarjeta flex flex-col p-6 ${p.destacado ? "ring-2 ring-piedra-900" : ""}`}
          >
            {p.destacado && (
              <span className="mb-3 w-fit rounded-full bg-piedra-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Si vendes webs a otros
              </span>
            )}
            <h2 className="font-display text-xl font-semibold text-piedra-900">{p.nombre}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-piedra-600">{p.resumen}</p>

            <p className="mt-6">
              <span className="font-display text-4xl font-bold text-piedra-900">
                {p.precio}
              </span>
            </p>
            <p className="mt-1 text-sm text-piedra-600">{p.periodo}</p>

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

            <div className="mt-7">
              <BotonPago plan={p.id} destacado={p.destacado} />
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-3xl">
        <div className="tarjeta p-6">
          <h2 className="font-display text-lg font-semibold text-piedra-900">
            Preguntas sobre el pago
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-piedra-800">¿Hay permanencia?</dt>
              <dd className="mt-1 leading-relaxed text-piedra-600">
                Ninguna. Pro se cancela cuando quieras desde el enlace que recibes por email.
                Auditoría y Kit Agencias son pago único e incluyen 12 meses de Pro.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-piedra-800">¿Puedo pagar con PayPal o transferencia?</dt>
              <dd className="mt-1 leading-relaxed text-piedra-600">
                Sí. Si prefieres PayPal, transferencia o factura con IVA, escríbenos y te
                enviamos las alternativas. Para empresas Emitimos factura con NIF.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-piedra-800">
                ¿Y si SelloIA se equivoca?
              </dt>
              <dd className="mt-1 leading-relaxed text-piedra-600">
                SelloIA es un producto nuevo. Preferimos decirte lo que hacemos mal antes de
                que lo descubras: si un escaneo falla o se equivoca, nos escribes y te lo
                arreglamos o te devolvemos el dinero.
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-8 rounded-lg border border-piedra-200 bg-riesgo-medio-fondo p-4">
          <p className="text-xs leading-relaxed text-piedra-700">
            <strong>Aviso legal.</strong> SelloIA ofrece herramientas técnicas de verificación
            y plantillas informativas.{" "}
            <strong>No constituye asesoramiento jurídico.</strong> Las obligaciones concretas
            dependen de tu situación y de la interpretación de la autoridad competente.
            Consulta con un profesional del derecho. Ver{" "}
            <Link href="/aviso-legal" className="underline underline-offset-2">
              aviso legal
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
