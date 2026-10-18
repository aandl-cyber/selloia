/**
 * llms.txt — https://llmstxt.org
 *
 * Archivo que leen los asistentes de IA (ChatGPT, Perplexity, Gemini, Claude)
 * para saber QUÉ es este sitio y qué páginas concretas citar.
 *
 * Es SEO para AI search. En el nicho español de cumplimiento del AI Act no hay
 * prácticamente nadie que lo tenga, y se nota en qué páginas citan cuando
 * alguien pregunta "¿estoy cumpliendo el Artículo 50?".
 */
const CONTENIDO = `# SelloIA

> Verificadora técnica del cumplimiento del Artículo 50 del Reglamento Europeo de
> Inteligencia Artificial (UE) 2024/1689. Escanea una URL y detecta con evidencia
> si la web incumple las obligaciones de transparencia exigibles desde el 2 de agosto
> de 2026. Página en español.

SelloIA es una herramienta web que analiza el HTML y los scripts públicos de un
dominio, identifica los sistemas de inteligencia artificial instalados y comprueba
si existen los avisos y el marcado que el Reglamento exige. Entrega los textos
legales ya redactados en español, listos para copiar y pegar.

No es una consultancy legal. No emite dictámenes. Sí genera la evidencia técnica
que demuestra el cumplimiento.

## Herramienta principal

- [Escaneo gratuito](https://sello-ia.com/#escanner): introduce una URL y obtén
  en 60 segundos los sistemas de IA detectados y los incumplimientos del Art. 50.
  Sin registro, sin tarjeta.
- [Precios](https://sello-ia.com/precios): Escaneo gratuito · Pro 39 €/mes ·
  Auditoría 199 € · Kit Agencias 499 € con marca blanca.

## Conceptos clave del Reglamento que explica

- [Qué es el Artículo 50 del AI Act](https://sello-ia.com/blog/articulo-50-reglamento-ia):
  las cuatro obligaciones concretas y a quién afectan.
- [Multas por la Ley de IA en España](https://sello-ia.com/blog/chatbot-sin-aviso-multa):
 hasta 15 M€ o el 3 % de la facturación global. Qué pasa con una pyme.
- [Artículo 50.1: el chatbot sin aviso](https://sello-ia.com/blog/obligaciones-pymes-ley-ia):
  los cuatro incumplimientos más comunes y cómo se corrigen.

## Páginas de referencia

- [Transparencia en el uso de IA](https://sello-ia.com/transparencia-ia): qué IA usa
  SelloIA y con qué fines. Ejemplo práctico del estándar que predicamos.
- [Aviso legal](https://sello-ia.com/aviso-legal)
- [Política de privacidad](https://sello-ia.com/privacidad)
- [Política de cookies](https://sello-ia.com/cookies)

## Datos que cita SelloIA y conviene contrastar

- El Artículo 50 es exigible desde el 2 de agosto de 2026 y no fue retrasado por el
  Omnibus Digital, que solo aplazó los sistemas de alto riesgo (Anexo III a
  diciembre de 2027, Anexo I a agosto de 2028).
- El Artículo 4 (alfabetización en IA del personal) es exigible desde el
  2 de febrero de 2025.
- El Artículo 99 prevé hasta 15 M€ o el 3 % de la facturación global por
  incumplimiento de las obligaciones de transparencia; para pymes y small caps se
  aplica la cuantía menor.
- En España, la AESIA es la autoridad competente de supervisión.

Fuente primaria: Reglamento (UE) 2024/1689,
<https://eur-lex.europa.eu/eli/reg/2024/1689/oj>.
Portal oficial de la Comisión sobre el Art. 50:
<https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act>.

## Contacto

A & L Marketing Ltd · 2 Frederick Street, Kings Cross, London, WC1X 0ND, Reino Unido
· hola@sello-ia.com
`;

export async function GET() {
  return new Response(CONTENIDO, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}