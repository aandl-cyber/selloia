import type { Metadata } from "next";
import Link from "next/link";
import BotonPago from "@/components/boton-pago";
import type { PlanId } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Escaneo gratuito, SelloIA Pro a 39 €/mes, auditoría puntual a 199 € y Kit Agencias a 499 € con marca blanca. Sin permanencia.",
  alternates: { canonical: "/precios" },
  openGraph: {
    title: "Precios · SelloIA",
    description: "Sin permanencia. Cancela cuando quieras.",
    url: "https://selloia.es/precios",
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
    precio: "39 €",
    periodo: "al mes, por dominio",
    resumen: "Para quien tiene un chatbot y quiere que no se rompa.",
    items: [
      "Escaneo completo cada 30 días",
      "Alerta el día que el aviso de IA desaparece",
      "Alerta cuando montas un sistema nuevo",
      "SelloIA con página de verificación pública",
      "Widget de aviso listo para pegar",
    ],
    destacado: false,
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
    destacado: true,
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
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
        {PLANES.map((p) => (
          <div
            key={p.id}
            className={`tarjeta flex flex-col p-6 ${p.destacado ? "ring-2 ring-piedra-900" : ""}`}
          >
            {p.destacado && (
              <span className="mb-3 w-fit rounded-full bg-piedra-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                El que más se vende
              </span>
            )}
            <h2 className="font-display text-xl font-semibold text-piedra-900">{p.nombre}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-piedra-500">{p.resumen}</p>

            <p className="mt-6 font-display text-4xl font-bold text-piedra-900">{p.precio}</p>
            <p className="mt-1 text-sm text-piedra-500">{p.periodo}</p>

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