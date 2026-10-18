import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "¿Estoy cubierto?",
  description:
    "Cuatro preguntas para saber si el Artículo 50 del Reglamento Europeo de IA te aplica y qué tienes que hacer.",
  alternates: { canonical: "/comprobar" },
};

const PREGUNTAS = [
  {
    q: "¿Tienes un chatbot, un avatar o un asistente de voz en tu web?",
    a: "Si tu web tiene un chat de soporte, un avatar generado o un teléfono automatizado, el Art. 50.1 te aplica. Puede ser Zendesk, Intercom, Tidio, Crisp, Botpress o cualquier otro: da igual el proveedor.",
  },
  {
    q: "¿Publicas imágenes, vídeos o textos generados por IA?",
    a: "Si usas IA para escribir artículos, descripciones de producto o imágenes de campaña, el Art. 50.4 exige identificarlo de forma visible, y el 50.2 pide además un marcado técnico. Son dos obligaciones distintas.",
  },
  {
    q: "¿Tiene alguien de tu equipo que lo esté usando ChatGPT, Copilot o similar para trabajar?",
    a: "Aunque no haya nada visible en tu web, el Art. 4 te obliga desde el 2 de febrero de 2025 a documentar que tu personal sabe usar estas herramientas. No se ve desde fuera, pero es lo que más rápido te piden.",
  },
];

export default function Comprobar() {
  return (
    <div className="contenedor py-16 md:py-20">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-bold tracking-tight text-piedra-900 md:text-4xl">
          ¿Estoy cubierto por la Ley de IA?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-piedra-600">
          Tres preguntas. Si respondes que sí a alguna, te aplica y hay algo que hacer.
        </p>

        <ol className="mt-10 space-y-4">
          {PREGUNTAS.map((p, i) => (
            <li key={p.q} className="tarjeta p-6">
              <div className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="font-mono text-lg font-bold text-piedra-400"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2 className="font-semibold leading-snug text-piedra-900">{p.q}</h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-piedra-600">{p.a}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-lg border border-riesgo-medio/25 bg-riesgo-medio-fondo p-5">
          <h2 className="font-display text-lg font-semibold text-piedra-900">
            ¿Has dicho que sí a alguna? Escanea tu web
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-piedra-700">
            Estas preguntas te dicen si te aplica. El escaneo te dice{" "}
            <strong>qué tienes exactamente</strong>: qué sistema de IA has detectado, en qué
            página y si le falta el aviso. Sesenta segundos, sin registro.
          </p>
          <Link href="/#escanner" className="boton boton-acento mt-4">
            Escanear mi web gratis
          </Link>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-piedra-500">
          Información orientativa. <strong>No constituye asesoramiento jurídico.</strong> Si
          tienes dudas concretas, consulta con un profesional del derecho.
        </p>
      </div>
    </div>
  );
}