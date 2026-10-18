import type { LegalPack } from "@/lib/types";

/**
 * Textos legales en español listos para pegar.
 *
 * Son plantillas informativas, NO asesoramiento jurídico. Cada pack viaja
 * acompañado del descargo legal correspondiente.
 */

const H = (n: string, titulo: string, cuerpo: string) =>
  `<h2 style="margin:1.6rem 0 .5rem;font-size:1.15rem;font-weight:600">${n}. ${titulo}</h2>\n<p style="margin:.5rem 0;line-height:1.7">${cuerpo}</p>`;

export function generarLegalPack(dominio: string): LegalPack {
  const d = dominio.replace(/^www\./, "");
  const hoy = new Date();
  const fechaISO = hoy.toISOString().slice(0, 10);
  const fechaLarga = hoy.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── 1. Aviso de chatbot (Art. 50.1) ──────────────────────────────────────
  const avisoChatbot = `<!-- SelloIA · Aviso Art. 50.1 · Reg. (UE) 2024/1689 -->
<div class="selloia-aviso" role="status" aria-live="polite"
     style="display:flex;gap:.5rem;align-items:flex-start;padding:.7rem .9rem;
            margin:.75rem 0;font-size:.875rem;line-height:1.5;
            border:1px solid #d6d3d1;border-radius:.6rem;background:#fafaf9;color:#292524">
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
       style="flex:none;margin-top:.15rem">
    <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.3"/>
    <path d="M8 4.5v.01M8 7v4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  </svg>
  <p style="margin:0">
    <strong>Estas hablando con un sistema de inteligencia artificial.</strong>
    Las respuestas se generan automaticamente y pueden contener errores.
    Si necesitas una gestion humana, escribenos por otro medio.
  </p>
</div>`;

  // ── 2. Aviso de contenido generado (Art. 50.4) ───────────────────────────
  const avisoGenerativo = `<!-- SelloIA · Aviso Art. 50.4 · contenido sintetico -->
<p class="selloia-contenido-ia" style="font-size:.85rem;color:#57534e;
   border-left:3px solid #a8a29e;padding-left:.75rem;margin:1.25rem 0">
  <strong>Contenido generado con inteligencia artificial.</strong>
  Este texto fue elaborado con asistencia de IA y ha sido revisado por una persona.
  Ultima revision: <time datetime="${fechaISO}">${fechaLarga}</time>.
</p>`;

  // ── 3. Página de transparencia completa ───────────────────────────────────
  const paginaTransparencia = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transparencia en el uso de inteligencia artificial — ${d}</title>
<meta name="robots" content="index,follow">
<meta name="description" content="Que sistemas de inteligencia artificial utiliza ${d}, con que fines y como se identifican sus salidas. Conforme al Articulo 50 del Reglamento (UE) 2024/1689.">
<link rel="canonical" href="https://${d}/transparencia-ia">
</head>
<body>
<main>
<h1>Transparencia en el uso de inteligencia artificial</h1>
<p><time datetime="${fechaISO}">Ultima actualizacion: ${fechaLarga}</time></p>

<p>Esta pagina informa de los sistemas de inteligencia artificial utilizados en
<strong>${d}</strong>, de acuerdo con el Articulo 50 del Reglamento (UE) 2024/1689
(Reglamento Europeo de Inteligencia Artificial), en vigor desde el 2 de agosto de 2026.</p>

${H(
  "1",
  "Sistemas de IA que interactúan contigo",
  `Si en esta web hay un asistente conversacional, un chat de soporte o un avatar,
el sistema esta disenado para informarte en el momento en que se inicia la
interaccion. Si en algun momento no queda claro que estas hablando con una
maquina, escribenos y lo corregimos.`
)}
${H(
  "2",
  "Contenido generado y su identificacion",
  `Cuando publicamos textos, imagenes, audio o video elaborados con asistencia de
inteligencia artificial, se indica de forma visible junto al contenido. En los
casos previstos por el Reglamento, la salida ademas incorpora marcado legible
por maquina que permite detectar su origen sintetico.`
)}
${H(
  "3",
  "Decisiones automatizadas y perfiles",
  `No tomamos decisiones con efectos juridicos sobre personas mediante sistemas
automatizados. Si alguna vez lo hicieramos, te informariamos previamente y tendrias
derecho a revision humana conforme al RGPD.`
)}
${H(
  "4",
  "Quien es responsable",
  `${d} es responsable del despliegue de los sistemas descritos en esta pagina.`
)}
${H(
  "5",
  "Contacto",
  `Para cualquier cuestion relacionada con esta pagina o con el uso de IA en
${d}, puedes escribirnos a <a href="mailto:privacidad@${d}">privacidad@${d}</a>.`
)}
${H(
  "6",
  "Fundamento y alcance",
  `Esta informacion se proporciona para dar cumplimiento al Articulo 50 del
Reglamento (UE) 2024/1689 y a los principios de transparencia del RGPD. No
constituye asesoramiento juridico.`
)}
</main>
</body>
</html>`;

  // ── 4. Política interna de uso (Art. 26 + Art. 4) ────────────────────────
  const politicaInterna = `<h1>Política interna de uso de inteligencia artificial</h1>
<p><strong>Documento de referencia</strong> · ${d} · Revisión ${hoy.getFullYear()}</p>

<h2>1. Objetivo</h2>
<p>Establecer las reglas que todo el personal debe seguir al usar herramientas de
inteligencia artificial en el trabajo. Da cumplimiento al Artículo 4 (alfabetización
en IA) y al Artículo 26 (obligaciones del responsable del despliegue) del
Reglamento (UE) 2024/1689.</p>

<h2>2. Alcance</h2>
<p>Aplica a todo el personal, incluidas las personas contratadas por etapas, y a
cualquier proveedor que actúe por cuenta de ${d}.</p>

<h2>3. Principios rectores</h2>
<ol>
  <li><strong>Revisión humana obligatoria.</strong> Ninguna salida de IA se publica
      ni se comunica a un cliente sin que una persona la haya revisado y aprobado.</li>
  <li><strong>No introducir datos personales</strong> ni información confidencial
      en herramientas de IA sin autorización previa del responsable de protección
      de datos.</li>
  <li><strong>Verificación de los derechos de uso.</strong> Antes de usar material
      generado por IA en piezas comerciales, hay que comprobar que la licencia de
      la herramienta lo permite.</li>
  <li><strong>Transparencia.</strong> Todo contenido publicado con asistencia
      relevante de IA se identifica de forma visible, de acuerdo con el
      Artículo 50.</li>
  <li><strong>Prohibiciones.</strong> No se emplea IA para perfilado,
      vigilancia intrusiva del empleado ni decisiones sobre contratación,
      promoción o ascensos, sin autorización expresa de dirección.</li>
</ol>

<h2>4. Registro de sistemas</h2>
<p>El responsable de protección de datos mantiene el inventario de sistemas de IA
en uso. Cualquier alta o baja debe registrarse en un plazo de 5 días naturales.</p>

<h2>5. Formación</h2>
<p>Todo el personal recibe formación en alfabetización en IA antes de su primera
utilización y con carácter anual. Consta el registro de formación —fecha,
contenido, asistentes y responsable— que se conserva durante 3 años.</p>

<h2>6. Incidencias</h2>
<p>Cualquier salida de IA que produzca un daño, una situación discriminatoria o una
violación de datos se comunica al responsable de protección de datos en el plazo
de 24 horas.</p>`;

  // ── 5. Snippet de marcado legible por máquina (Art. 50.2) ─────────────────
  const snippetMarcado = `<!-- SelloIA · Marcado legible por maquina · Art. 50.2
     Anade esto en el <head> de cada pagina con contenido generado por IA.
     Complementa el aviso VISIBLE: el marcado no sustituye a la informacion. -->

<meta name="generator" content="${d} + IA (asistencia)">
<meta name="ai-content" content="ai-assisted">
<meta name="ai-content-review" content="${fechaISO}">
<meta property="og:ai_content_type" content="text">
<meta name="ai_disclosure" content="visible-disclosure-presented">

<!-- Capa semantica: describe el origen del bloque para lectores de maquina -->
<div itemscope itemtype="https://schema.org/Article">
  <meta itemprop="dateModified" content="${fechaISO}">
  <div itemprop="text" data-ai-generated="true" data-ai-review="human">
    <!-- ...contenido... -->
  </div>
</div>

<!-- Si el contenido es integramente sintetico, anade ademas: -->
<span class="ai-generated-label">Generado con inteligencia artificial</span>`;

  return {
    avisoChatbot: avisoChatbot.trim(),
    avisoGenerativo: avisoGenerativo.trim(),
    paginaTransparencia: paginaTransparencia.trim(),
    politicaInterna: politicaInterna.trim(),
    snippetMarcado: snippetMarcado.trim(),
  };
}

/** Descargo que acompaña a toda entrega de SelloIA. */
export const DESCARGO =
  "SelloIA ofrece herramientas tecnicas de verificacion y plantillas informativas. " +
  "Este material no constituye asesoramiento juridico. Las obligaciones concretas " +
  "dependen de tu situacion y de la interpretacion de la autoridad competente. " +
  "Consulta con un profesional del derecho antes de dar por bueno tu cumplimiento.";