/**
 * Aviso para la plantilla workforce del Real Decreto 723/2026.
 *
 * Contexto: el Real Decreto 723/2026 entró en vigor el 5 de octubre de 2026. Su
 * artículo 3.2.k obliga a informar por escrito a cada persona trabajadora de la
 * existencia de sistemas algorítmicos o automatizados de decisión y, cuando se
 * utilicen para decidir sobre sus condiciones de trabajo, también de sus pautas,
 * criterios y reglas de funcionamiento.
 *
 * La AEPD ya ha dirigido advertencias en este área (AI-00009-2026, de 23 de
 * septiembre de 2026, a una empresa que iba a puntuar currículos con IA). No
 * es un riesgo teórico.
 *
 * Esto genera el documento en el formato que la empresa tiene que poder
 * acreditar: qué sistema, para qué decisiones, con qué reglas, quién revisa y
 * cómo exercise la persona Affected. Un texto genérico no sirve, porque la
 * pregunta de la autoridad es si la supervisión humana es real.
 *
 * No es asesoramiento jurídico. Viaja con su descargo correspondiente.
 */

export interface Entradas723 {
  empresa: string;
  sistemas: string;
  decisiones: string;
  revisor: string;
  canales: string;
}

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const lista = (v: string) =>
  v
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * La fecha se pasa como parámetro y no se calcula dentro.
 *
 * Estas funciones se invocan desde un Client Component, y con `cacheComponents`
 * un `new Date()` durante el prerenderado es un valor inestable que rompe el
 * build. Además, como funciones puras se pueden probar sin depender del reloj.
 *
 * El original menciona "el 5 de octubre de 2026", que es la entrada en vigor
 * del Real Decreto, no la fecha en que se genera el documento.
 */
const ENTRADA_EN_VIGOR = "5 de octubre de 2026";

/** Documento completo en HTML, listo para imprimir o pegar en la intranet. */
export function generarAviso723(e: Entradas723, hoy: string): string {
  const sistemas = lista(e.sistemas);
  const decisiones = lista(e.decisiones);
  const canales = lista(e.canales);

  const bloqueLista = (titulo: string, items: string[]) =>
    items.length
      ? `<h2 style="margin:1.8rem 0 .6rem;font-size:1.05rem;font-weight:600">${titulo}</h2>
<ul style="margin:.5rem 0;padding-left:1.25rem;line-height:1.75">
${items.map((i) => `  <li style="margin:.3rem 0">${esc(i)}</li>`).join("\n")}
</ul>`
      : "";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Información sobre el uso de sistemas de IA en las decisiones laborales — ${esc(e.empresa)}</title>
<style>
  body{font:15px/1.75 Georgia,'Times New Roman',serif;color:#1c1917;max-width:44rem;margin:0 auto;padding:3rem 1.5rem}
  h1{font-size:1.5rem;margin:0 0 .3rem}
  .meta{color:#78716c;font-size:.85rem;margin-bottom:2rem}
  h2{font-size:1.05rem;margin:1.8rem 0 .6rem}
  ul{padding-left:1.25rem;line-height:1.75}
  li{margin:.3rem 0}
  .recuadro{border:1px solid #d6d3d1;border-left:3px solid #44403c;background:#fafaf9;padding:1rem 1.15rem;margin:1.25rem 0;border-radius:.4rem}
  .firma{margin-top:2.5rem;padding-top:1.25rem;border-top:1px solid #d6d3d1;font-size:.9rem;color:#57534e}
  @media print{body{padding:0}}
</style>
</head>
<body>

<h1>Información sobre el uso de sistemas de inteligencia artificial</h1>
<p class="meta">${esc(e.empresa)} · actualizado a ${hoy}</p>

<p>
  Conforme al <strong>Real Decreto 723/2026</strong>, en vigor desde el ${ENTRADA_EN_VIGOR},
  y al principio de
  transparencia en el uso de sistemas de inteligencia artificial, te informamos del uso
  de sistemas automatizados en las decisiones que afectan a tu trabajo.
</p>

<div class="recuadro">
  <strong>En una frase:</strong> ${esc(
    sistemas.length ? `${e.empresa} utiliza sistemas de IA en ${sistemas.length === 1 ? "un proceso" : `${sistemas.length} procesos`} que affects a tus condiciones de trabajo.` : `${e.empresa} no utiliza sistemas de IA para decidir sobre tus condiciones de trabajo.`
  )}
</div>

${bloqueLista("1. Qué sistemas se utilizan", sistemas)}
${
  bloqueLista("2. En qué decisiones intervienen y cuáles no", decisiones) ||
  `<h2 style="margin:1.8rem 0 .6rem;font-size:1.05rem;font-weight:600">2. En qué decisiones intervienen</h2>
<p style="margin:.5rem 0;line-height:1.75">
  En la actualidad no se utilizan sistemas de IA para decidir sobre tus condiciones de
  trabajo. Si esto cambiara, se actualizará esta información y se os comunicaría antes.
</p>`
}

<h2 style="margin:1.8rem 0 .6rem;font-size:1.05rem;font-weight:600">3. Reglas que sigue el sistema</h2>
<p style="margin:.5rem 0;line-height:1.75">
  El sistema no decide de forma autónoma. Ordena, filtra o propone, y una persona con
  conocimiento real del puesto toma la decisión final. Cualquier propuesta del sistema
  puede ser revisada, modificada o descartada sin dar explicaciones, y quien revisa
  dispone de tiempo suficiente para hacerlo.
</p>
<p style="margin:.5rem 0;line-height:1.75">
  El sistema no utiliza datos sensibles (salud, origen, orientación
  política, religión) para evaluar tu desempeño, y sus criterios se revisan
  periódicamente para comprobar que no producen efectos negativos sobre un
  colectivo.
</p>

<h2 style="margin:1.8rem 0 .6rem;font-size:1.05rem;font-weight:600">4. Quién revisa las decisiones</h2>
<p style="margin:.5rem 0;line-height:1.75">
  ${esc(e.revisor || "La persona responsable de Recursos Humanos designada por la empresa")}
</p>

<h2 style="margin:1.8rem 0 .6rem;font-size:1.05rem;font-weight:600">5. Tus derechos</h2>
<p style="margin:.5rem 0;line-height:1.75">
  Puedes <strong>solicitar revisión humana</strong> de cualquier decisión, pedir que se explique en
  qué se basó y ejercer los derechos que te reconoce el Reglamento General de Protección
  de Datos. Tu identidad no condiciona el ejercicio de estos derechos.
</p>

${
  canales.length
    ? bloqueLista("6. Dónde plantearlo", canales)
    : `<h2 style="margin:1.8rem 0 .6rem;font-size:1.05rem;font-weight:600">6. Dónde plantearlo</h2>
<p style="margin:.5rem 0;line-height:1.75">Escribe a tu persona de referencia de Recursos Humanos.</p>`
}

<div class="firma">
  <p style="margin:0">
    Documento informativo. ${esc(e.empresa)} lo mantiene actualizado y lo publicará cada
    vez que cambie el uso de sistemas de inteligencia artificial.
  </p>
</div>

</body>
</html>`;
}

/** Versión en texto plano, para enviar por correo o Messenger. */
export function generarAviso723Texto(e: Entradas723, hoy: string): string {
  const sistemas = lista(e.sistemas);
  const decisiones = lista(e.decisiones);
  const canales = lista(e.canales);

  const seccion = (t: string, items: string[]) =>
    items.length ? `${t}\n${items.map((i) => `  - ${i}`).join("\n")}\n` : "";

  return `INFORMACIÓN SOBRE EL USO DE SISTEMAS DE INTELIGENCIA ARTIFICIAL
${e.empresa} · ${hoy}

Conforme al Real Decreto 723/2026 (en vigor desde el ${ENTRADA_EN_VIGOR}), te informamos del uso de sistemas automatizados en las decisiones que afectan a tu trabajo.

${seccion("1. QUÉ SISTEMAS SE UTILIZAN", sistemas)}
${
  decisiones.length
    ? seccion("2. EN QUÉ DECISIONES INTERVIENEN", decisiones)
    : "2. EN QUÉ DECISIONES INTERVIENEN\n  En la actualidad no se utilizan sistemas de IA para decidir sobre tus condiciones de trabajo.\n"
}
3. REGLAS DEL SISTEMA
  El sistema no decide de forma autónoma. Ordena, filtra o propone, y una persona
  con conocimiento real del puesto toma la decisión final. Cualquier propuesta puede
  revisarse, modificarse o descartarse. El sistema no utiliza datos sensibles para
  evaluar tu desempeño.

4. QUIÉN REVISA LAS DECISIONES
  ${e.revisor || "Tu persona de referencia de Recursos Humanos"}

5. TUS DERECHOS
  Puedes solicitar revisión humana de cualquier decisión, pedir que se explique en qué
  se basó y ejercer los derechos que te reconoce el RGPD. Tu identidad no condiciona
  su ejercicio.

${seccion("6. DÓNDE PLANTEARLO", canales)}

Documento informativo. ${e.empresa} lo mantiene actualizado.`;
}

export const PLANTILLAS_SISTEMAS = [
  "Selección y cribado de candidaturas",
  "Clasificación de currículums y puntuación automática",
  "Gestión de altas, bajas y cambios de turno",
  "Asignación de objetivos y evaluación del desempeño",
  "Control de asistencia y absentismo",
  "Atención al cliente automatizada",
  "Chatbot de atención al empleado",
];

export const PLANTILLAS_DECISIONES = [
  "NO participa en ninguna decisión sobre tus condiciones de trabajo",
  "Preordena candidaturas. La decisión final es siempre humana",
  "Propone la evaluación inicial. La decisión final es siempre humana",
  "Ordena solicitudes de cambio de turno. La decisión final es siempre humana",
  "Detecta absentismo y avisa. La decisión final es siempre humana",
];