"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  generarAviso723,
  generarAviso723Texto,
  PLANTILLAS_SISTEMAS,
  PLANTILLAS_DECISIONES,
} from "@/lib/legal723";

// Los metadatos están en layout.tsx: esta página es un Client Component y Next
// no admite `export const metadata` en un módulo cliente.

const campo = "campo text-[15px]";
const etiqueta = "block text-sm font-semibold text-piedra-800";

export default function InformacionTrabajadores() {
  const [empresa, setEmpresa] = useState("");
  const [sistemas, setSistemas] = useState<string[]>([]);
  const [otra, setOtra] = useState("");
  const [decisiones, setDecisiones] = useState<string[]>([]);
  const [revisor, setRevisor] = useState("");
  const [canales, setCanales] = useState("");
  const [vista, setVista] = useState<"documento" | "texto">("documento");

  // La fecha se calcula en el navegador, nunca en el servidor: con
  // `cacheComponents`, un `new Date()` durante el prerenderado es un valor
  // inestable y rompe el build. Hasta que haya fecha se muestra el documento sin
  // ella, para que el HTML del servidor no dependa del reloj.
  const [hoy, setHoy] = useState("");
  useEffect(() => {
    setHoy(new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }));
  }, []);

  const alternar = (lista: string[], v: string, set: (x: string[]) => void) =>
    set(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  const entradas = {
    empresa: empresa || "Tu empresa",
    sistemas: [...sistemas, ...(otra ? otra.split("\n") : [])]
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n"),
    decisiones: decisiones.join("\n"),
    revisor,
    canales,
  };

  const generado = generarAviso723(entradas, hoy);
  const textoPlano = generarAviso723Texto(entradas, hoy);

  return (
    <div className="contenedor py-14 md:py-20">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-piedra-500">
          Real Decreto 723/2026
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-piedra-900 md:text-4xl">
          La información que tu plantilla tiene derecho a recibir
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-piedra-600">
          Desde el <strong className="text-piedra-900">5 de octubre de 2026</strong> estás
          obligado a informar por escrito a cada persona trabajadora cuando usas sistemas de
          IA para decidir sobre sus condiciones de trabajo: qué sistema es, con qué reglas
          decide y quién revisa.
        </p>

        <div className="mt-6 rounded-lg border-l-4 border-riesgo-ok bg-riesgo-bajo-fondo p-5">
          <p className="text-[15px] leading-relaxed text-piedra-800">
            <strong>No es un riesgo teórico.</strong> La AEPD ya ha dirigido una advertencia
            (AI-00009-2026, 23 de septiembre de 2026) a una empresa que iba a puntuar
            currículos con IA, y otra a dos ayuntamientos por IA en videovigilancia. La
            advertencia no es multa, pero es el aviso de que la próxima sí lo será.
          </p>
        </div>

        {/* ── Formulario ── */}
        <section className="tarjeta mt-10 p-6 md:p-8">
          <h2 className="font-display text-xl font-bold text-piedra-900">Rellena y descarga</h2>

          <div className="mt-5">
            <label htmlFor="empresa" className={etiqueta}>
              Nombre de la empresa
            </label>
            <input
              id="empresa"
              className={`${campo} mt-1.5`}
              placeholder="Nombre S. L."
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
            />
          </div>

          <fieldset className="mt-6">
            <legend className={etiqueta}>
              ¿Qué sistemas de IA usáis en decisiones sobre el trabajo?
            </legend>
            <p className="mt-1 text-sm text-piedra-500">
              Marca lo que aplique. Si no usas ninguno, deja esto vacío.
            </p>
            <div className="mt-3 space-y-2">
              {PLANTILLAS_SISTEMAS.map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-piedra-200 p-3 text-[15px] hover:bg-piedra-50"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-piedra-900"
                    checked={sistemas.includes(s)}
                    onChange={() => alternar(sistemas, s, setSistemas)}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
            <textarea
              className={`${campo} mt-3 min-h-20`}
              placeholder="Otros sistemas, uno por línea"
              value={otra}
              onChange={(e) => setOtra(e.target.value)}
            />
          </fieldset>

          <fieldset className="mt-6">
            <legend className={etiqueta}>¿Cómo intervienen exactamente?</legend>
            <div className="mt-3 space-y-2">
              {PLANTILLAS_DECISIONES.map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-piedra-200 p-3 text-[15px] hover:bg-piedra-50"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-piedra-900"
                    checked={decisiones.includes(s)}
                    onChange={() => alternar(decisiones, s, setDecisiones)}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6">
            <label htmlFor="revisor" className={etiqueta}>
              Quién revisa las decisiones del sistema
            </label>
            <input
              id="revisor"
              className={`${campo} mt-1.5`}
              placeholder="p. ej. María López, responsable de Recursos Humanos"
              value={revisor}
              onChange={(e) => setRevisor(e.target.value)}
            />
            <p className="mt-1.5 text-sm text-piedra-500">
              Tiene que ser alguien con autoridad real para cambiar el resultado. Si tu
              «revisor» no puede, no cuenta.
            </p>
          </div>

          <div className="mt-6">
            <label htmlFor="canales" className={etiqueta}>
              Dónde puede plantearlo la plantilla
            </label>
            <input
              id="canales"
              className={`${campo} mt-1.5`}
              placeholder="rrhh@tuempresa.es, portal del empleado, reunión mensual"
              value={canales}
              onChange={(e) => setCanales(e.target.value)}
            />
          </div>
        </section>

        {/* ── Resultado ── */}
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-piedra-900">Tu documento</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setVista("documento")}
                className={`boton text-sm ${vista === "documento" ? "boton-primario" : "boton-secundario"}`}
              >
                Documento
              </button>
              <button
                onClick={() => setVista("texto")}
                className={`boton text-sm ${vista === "texto" ? "boton-primario" : "boton-secundario"}`}
              >
                Texto plano
              </button>
            </div>
          </div>

          <div className="tarjeta mt-4 overflow-hidden">
            {vista === "documento" ? (
              <iframe
                title="Vista previa del documento"
                srcDoc={generado}
                className="h-[34rem] w-full border-0 bg-white"
              />
            ) : (
              <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap bg-white p-6 text-sm leading-relaxed text-piedra-800">
                {textoPlano}
              </pre>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => navigator.clipboard?.writeText(vista === "documento" ? generado : textoPlano)}
              className="boton boton-primario"
            >
              Copiar
            </button>
            <a
              href={`data:text/html;charset=utf-8,${encodeURIComponent(generado)}`}
              download="informacion-trabajadores.html"
              className="boton boton-secundario"
            >
              Descargar HTML
            </a>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-piedra-500">
            Esto es una plantilla informativa, no asesoramiento jurídico. Cada empresa tiene
            su situación y el texto hay que ajustarlo a lo que realmente hace su sistema. Si
            necesitas el documento adaptado a tu caso, con revisión de la EIPD y del marco de
            supervisión humana, es parte de la auditoría.
          </p>
        </section>

        {/* ── Cruce con el producto ── */}
        <section className="tarjeta mt-12 p-7">
          <h2 className="font-display text-xl font-bold text-piedra-900">
            El aviso de la web es otra cosa
          </h2>
          <p className="mt-3 leading-relaxed text-piedra-600">
            El Real Decreto 723/2026 trata de sistemas internos que deciden sobre personas.
            El <strong className="text-piedra-900">Artículo 50 del Reglamento Europeo de IA</strong>{" "}
            trata de lo que ve el público: si tu web tiene un chatbot, un avatar o contenido
            generado con IA, tienes que avisarlo.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/#escanner" className="boton boton-primario">
              Comprobar mi web
            </Link>
            <Link href="/precios" className="boton boton-secundario">
              Ver la auditoría completa
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}