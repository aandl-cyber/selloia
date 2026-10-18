import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Estado del servicio",
  description: "Disponibilidad y estado operativo de SelloIA.",
  alternates: { canonical: "/estado" },
  robots: { index: false, follow: true },
};

const SERVICIOS = [
  { n: "Sitio web y escaneo", d: "Vercel", s: "ok" },
  { n: "Pagos (Stripe)", d: "Stripe", s: "ok" },
  { n: "Envío de emails (Resend)", d: "Resend", s: "ok" },
  { n: "Recepción de respuestas", d: "Resend Inbound", s: "ok" },
];

export default function Estado() {
  return (
    <div className="contenedor py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-piedra-900">Estado del servicio</h1>
        <p className="mt-3 leading-relaxed text-piedra-600">
          Si algo no funciona, esta es la página que debes mirar primero. Si algo aparece
          en rojo, escríbenos y lo arreglamos.
        </p>

        <ul className="mt-8 divide-y divide-piedra-200 overflow-hidden rounded-lg border border-piedra-200 bg-white">
          {SERVICIOS.map((s) => (
            <li key={s.n} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium text-piedra-900">{s.n}</p>
                <p className="text-xs text-piedra-600">{s.d}</p>
              </div>
              <span className="etiqueta-riesgo riesgo-bajo shrink-0">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-riesgo-ok" />
                Operativo
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-sm text-piedra-600">
          Incidencias relevantes se anuncian{" "}
          <a
            href="mailto:hola@sello-ia.com"
            className="font-medium text-marca-600 underline underline-offset-2"
          >
            hola@sello-ia.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}