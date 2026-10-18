import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pago confirmado",
  description: "Tu pago se ha recibido correctamente.",
  robots: { index: false, follow: false },
};

const PASOS = [
  {
    t: "Te llega el acceso",
    d: "En menos de 5 minutos tienes un email con tu panel. Desde ahí pegas el widget de aviso y el SelloIA en tu web.",
  },
  {
    t: "Escaneamos tu dominio",
    d: "Lo hacemos al activar la suscripción y te envío el informe completo con los textos ya redactados.",
  },
  {
    t: "Lo revisamos cada 30 días",
    d: "Si algo cambia en tu web, te escribimos. Ese es el servicio completo: que no tengas que pensar en esto.",
  },
];

export default function Gracias() {
  return (
    <div className="contenedor py-20">
      <div className="mx-auto max-w-2xl">
        <div className="tarjeta p-8 text-center md:p-10">
          <span
            aria-hidden="true"
            className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-riesgo-bajo-fondo text-2xl text-riesgo-ok"
          >
            ✓
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold text-piedra-900">
            Pago recibido
          </h1>
          <p className="mt-3 leading-relaxed text-piedra-600">
            Gracias. Ya estamos en marcha. A continuación 일어나 lo que toca, sin que
            tengas que hacer nada.
          </p>
        </div>

        <ol className="mt-8 space-y-4">
          {PASOS.map((p, i) => (
            <li key={p.t} className="tarjeta flex gap-4 p-5">
              <span className="font-mono text-sm font-bold text-piedra-300">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-sm font-semibold text-piedra-900">{p.t}</h2>
                <p className="mt-1 text-sm leading-relaxed text-piedra-600">{p.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 text-center">
          <p className="text-sm text-piedra-600">
            ¿Necesitas algo antes?{" "}
            <a
              href="mailto:hola@sello-ia.com"
              className="font-medium text-marca-600 underline underline-offset-4"
            >
              hola@sello-ia.com
            </a>
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-piedra-500 underline underline-offset-4 hover:text-piedra-900"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}