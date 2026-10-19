#!/usr/bin/env node
/**
 * Mapa competitivo: qué venden los demás y a qué precio.
 *
 * He encontrado varios sitios españoles que abordan el Art. 50 desde la
 * consultoría y ninguno parece escanear de verdad. Antes de invertir cinco días
 * hace falta saber qué precio hay y si el escaneo automático ya existe.
 */

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

async function pedir(url, ms = 25000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: UA, signal: ctrl.signal, redirect: "follow" });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(to);
  }
}

const plano = (h) =>
  h
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const OBJETIVOS = [
  ["derechoartificial.com", "https://www.derechoartificial.com/guias-ia/articulo-50-ai-act-guia-cumplimiento-pymes-2026"],
  ["aunoa.ai", "https://aunoa.ai/blog/ley-de-ia-ychatbots-como-cumplir-el-articulo-50-en-2026/"],
  ["ercel.ai", "https://ercel.ai/blog/art-50-que-debe-hacer-tu-chatbot"],
  ["taifa.es", "https://taifa.es/blog/pagina-web-para-clinica-dental/"],
];

(async () => {
  console.log("\n  MAPA COMPETITIVO\n");

  for (const [nombre, url] of OBJETIVOS) {
    const html = await pedir(url);
    const t = plano(html);
    console.log(`  ${nombre}`);
    if (!t) {
      console.log("    no accesible");
      console.log("");
      continue;
    }
    const precios = [...new Set([...t.matchAll(/(\d[\d.,]*\s?€|\b\d{2,6}\s?EUR\b)/g)].map((m) => m[0]))].slice(0, 6);
    const escanea = /escane|analiza tu (web|sitio|dominio)|scanner|comprobador|verificador/i.test(t);
    const 免费 = /\bgratis\b|\bgratuito\b/i.test(t);
    console.log(`    ${t.length} chars · escaneo automatico: ${escanea ? "SI" : "no"}`);
    console.log(`    precios citados: ${precios.length ? precios.join(" | ") : "ninguno visible"}`);
    const oferta = t.match(/(?:consulta|contacto|agenda|presupuesto|hablemos)[^.]{0,80}/i)?.[0];
    if (oferta) console.log(`    CTA: "${oferta.trim().slice(0, 90)}"`);
    console.log(`    ${t.slice(0, 260)}`);
    console.log("");
  }

  // ¿Existe ya un comprobador automático en español?
  console.log("  ¿Hay ya un escaner gratuito del Art. 50 en español?");
  const pruebas = [
    "https://www.google.com/search?q=%22art%C3%ADculo+50%22+comprobador+escaneo+web+gratis",
  ];
  console.log("  (comprobar por busqueda en el siguiente paso)");
  void pruebas;
})();