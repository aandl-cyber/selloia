import type { DeteccionIA } from "@/lib/types";

/**
 * Base de datos de firmas de sistemas de IA.
 *
 * Cada firma es una evidencia observable en el HTML o en los scripts que una
 * web carga. Cuando una de estas firmas aparece, hay un sistema de IA
 * interactuando con personas físicas -> Art. 50(1) del Reglamento (UE) 2024/1689.
 *
 * `peso` calibrado: los widgets de soporte con IA explícita pesan más que un
 * simple script de tracking. La puntuación final los tiene en cuenta.
 */

export interface Firma {
  proveedor: string;
  tipo: DeteccionIA["tipo"];
  /** Scripts/selectores que delatan la presencia del sistema. */
  scripts: string[];
  /** Texto visible en el DOM associated. */
  selectores?: string[];
  /** Marcas en window/global. */
  globals?: string[];
  peso: number;
  /** Si el proveedor es IA por naturaleza, el aviso es claramente necesario. */
  aiNativa: boolean;
  notas?: string;
}

export const FIRMAS: Firma[] = [
  // ── Chatbots con IA ────────────────────────────────────────────────────────
  {
    proveedor: "Intercom",
    tipo: "chatbot",
    scripts: ["js.intercomcdn.com", "window.Intercom", "intercomSettings"],
    selectores: ['[class*="intercom"]', "#intercom-container"],
    globals: ["Intercom"],
    peso: 95,
    aiNativa: true,
    notas:
      "Intercom Fin incluye Fin AI. El aviso debe mostrarse al inicio de la conversación, no solo en el pie.",
  },
  {
    proveedor: "Tidio",
    tipo: "chatbot",
    scripts: ["code.tidio.co", "window.tidio", "tidioLive"],
    selectores: [".tidio-widget", "#tidio-chatbox"],
    globals: ["tidioLive"],
    peso: 90,
    aiNativa: true,
  },
  {
    proveedor: "Crisp",
    tipo: "chatbot",
    scripts: ["client.crisp.chat", "window.CRISP"],
    selectores: [".crisp-client", "#crisp-chatbox"],
    globals: ["CRISP"],
    peso: 85,
    aiNativa: true,
  },
  {
    proveedor: "Zendesk",
    tipo: "chatbot",
    scripts: ["static.zdassets.com/ekr/snippet.js", "zE", "window.zESettings"],
    selectores: [".zendesk", "#ze_snackbar"],
    globals: ["zE", "zESettings"],
    peso: 85,
    aiNativa: true,
    notas: "El bot de Zendesk opera con IA; el widget de tickets no siempre.",
  },
  {
    proveedor: "Drift",
    tipo: "chatbot",
    scripts: ["js.driftt.com", "drift", "window.driftConfig"],
    selectores: ["#drift-widget"],
    globals: ["drift"],
    peso: 85,
    aiNativa: true,
  },
  {
    proveedor: "ManyContacts",
    tipo: "chatbot",
    scripts: ["static.manycontacts.app", "window.ManyContacts"],
    selectores: ["#manycontacts-widget"],
    globals: ["ManyContacts"],
    peso: 90,
    aiNativa: true,
  },
  {
    proveedor: "Chatfuel",
    tipo: "chatbot",
    scripts: ["cdn.chatfuel.co", "window.Chatfuel"],
    globals: ["Chatfuel"],
    peso: 90,
    aiNativa: true,
  },
  {
    proveedor: "Repulsive.io",
    tipo: "chatbot",
    scripts: ["static.repulsive.io", "window.Repulsive"],
    globals: ["Repulsive"],
    peso: 85,
    aiNativa: true,
  },
  {
    proveedor: "Botpress",
    tipo: "chatbot",
    scripts: ["botpress.io", "window.botpress"],
    selectores: ["#bp-web-widget", "botpress"],
    globals: ["botpress"],
    peso: 95,
    aiNativa: true,
  },
  {
    proveedor: "Voiceflow",
    tipo: "chatbot",
    scripts: ["cdn.voiceflow.com", "window.voiceflow"],
    globals: ["voiceflow"],
    peso: 95,
    aiNativa: true,
  },
  {
    proveedor: "Dify",
    tipo: "chatbot",
    scripts: ["dify", "window.__dify", "chat.dify"],
    globals: ["dify"],
    peso: 95,
    aiNativa: true,
  },
  {
    proveedor: "Rasa",
    tipo: "chatbot",
    scripts: ["rasa.io/static", "rasaChat"],
    globals: ["rasaChat"],
    peso: 90,
    aiNativa: true,
  },
  {
    proveedor: "Watson Assistant",
    tipo: "chatbot",
    scripts: ["watson-assistant", "WebChat", "watsonplatform"],
    globals: ["WebChat"],
    peso: 95,
    aiNativa: true,
  },
  {
    proveedor: "Azure Bot Framework / Web Chat",
    tipo: "chatbot",
    scripts: ["botframework-directlinejs", "webchat.js"],
    globals: ["WebChat"],
    peso: 95,
    aiNativa: true,
  },

  // ── Widgets de soporte (pueden o no usar IA) ───────────────────────────────
  {
    proveedor: "HubSpot",
    tipo: "chatbot",
    scripts: ["js.hs-scripts.com", "js.hsforms.net", "js.hs-analytics.net"],
    selectores: ["#hs-eu-cookie", ".hs-form-iframe"],
    globals: ["_hsq", "hubspot"],
    peso: 55,
    aiNativa: false,
    notas:
      "HubSpot contieneucket de IA (Breeze) y herramientas de contenido con IA. Si lo usas, el aviso es obligatorio.",
  },
  {
    proveedor: "Salesforce Live Agent",
    tipo: "chatbot",
    scripts: ["d2a1i2p2x3e1.cloudfront.net", "SalesforceLiveAgent"],
    globals: ["SalesforceLiveAgent"],
    peso: 70,
    aiNativa: false,
  },
  {
    proveedor: "LiveChat",
    tipo: "chatbot",
    scripts: ["livechatinc.com", "LiveChatWidget"],
    globals: ["LiveChatWidget"],
    peso: 50,
    aiNativa: false,
  },
  {
    proveedor: "Olark",
    tipo: "chatbot",
    scripts: ["static.olark.com", "olark"],
    globals: ["olark"],
    peso: 45,
    aiNativa: false,
  },
  {
    proveedor: "Tawk.to",
    tipo: "chatbot",
    scripts: ["embed.tawk.to", "Tawk_API"],
    globals: ["Tawk_API"],
    peso: 45,
    aiNativa: false,
  },
  {
    proveedor: "Jivosite",
    tipo: "chatbot",
    scripts: ["code.jivosite.com", "jivosite"],
    globals: ["jivosite"],
    peso: 50,
    aiNativa: false,
  },
  {
    proveedor: "JitBit",
    tipo: "chatbot",
    scripts: ["static.jitbit.com", "JitBit"],
    globals: ["JitBit"],
    peso: 50,
    aiNativa: false,
  },

  // ── IA generativa integrada en la web ──────────────────────────────────────
  {
    proveedor: "OpenAI ChatGPT / API",
    tipo: "generador_contenido",
    scripts: ["chatgpt", "openai.com", "cdn.oaistatic.com"],
    globals: ["chatgpt"],
    peso: 90,
    aiNativa: true,
  },
  {
    proveedor: "Perplexity",
    tipo: "generador_contenido",
    scripts: ["perplexity", "perplexity.ai"],
    globals: ["perplexity"],
    peso: 70,
    aiNativa: true,
  },
  {
    proveedor: "Google Gemini / AI Overviews",
    tipo: "generador_contenido",
    scripts: ["gemini", "bard.google.com"],
    globals: ["gemini"],
    peso: 70,
    aiNativa: true,
  },
  {
    proveedor: "Copilot",
    tipo: "generador_contenido",
    scripts: ["copilot", "cdn.jsdelivr.net/npm/@microsoft/copilot"],
    peso: 65,
    aiNativa: true,
  },
  {
    proveedor: "Anthropic Claude",
    tipo: "generador_contenido",
    scripts: ["claude.ai", "anthropic"],
    globals: ["claude"],
    peso: 85,
    aiNativa: true,
  },

  // ── Voz y avatares ────────────────────────────────────────────────────────
  {
    proveedor: "ElevenLabs",
    tipo: "voz",
    scripts: ["elevenlabs.io", "elevenlabs"],
    peso: 95,
    aiNativa: true,
    notas: "Todo audio generado con ElevenLabs es contenido sintético (Art. 50.4).",
  },
  {
    proveedor: "Google Cloud Text-to-Speech",
    tipo: "voz",
    scripts: ["texttospeech", "cloudfunctions.run"],
    peso: 85,
    aiNativa: true,
  },
  {
    proveedor: "Amazon Polly",
    tipo: "voz",
    scripts: ["polly", "lex.aws"],
    peso: 85,
    aiNativa: true,
  },
  {
    proveedor: "Synthesia",
    tipo: "avatar",
    scripts: ["synthesia", "synthesia.io"],
    peso: 95,
    aiNativa: true,
    notas: "Avatares virtuales: Art. 50.1 con máxima exigencia de aviso.",
  },
  {
    proveedor: "HeyGen",
    tipo: "avatar",
    scripts: ["heygen", "d2lqpdd7nolr.cloudfront.net"],
    peso: 95,
    aiNativa: true,
  },
  {
    proveedor: "D-ID",
    tipo: "avatar",
    scripts: ["d-id.com", "d_id"],
    peso: 95,
    aiNativa: true,
  },
  {
    proveedor: "Microsoft Azure AI Speech",
    tipo: "voz",
    scripts: ["speech.microsoft.com", "SpeechSDK"],
    peso: 85,
    aiNativa: true,
  },

  // ── Generación de imágenes y contenido de interés público ──────────────────
  {
    proveedor: "Midjourney",
    tipo: "generador_contenido",
    scripts: ["midjourney"],
    peso: 95,
    aiNativa: true,
  },
  {
    proveedor: "DALL·E / OpenAI Images",
    tipo: "generador_contenido",
    scripts: ["dalle", "openai"],
    peso: 90,
    aiNativa: true,
  },
  {
    proveedor: "Stable Diffusion",
    tipo: "generador_contenido",
    scripts: ["stability.ai", "stablediffusion"],
    peso: 95,
    aiNativa: true,
  },
  {
    proveedor: "Adobe Firefly",
    tipo: "generador_contenido",
    scripts: ["firefly", "adobe.com/firefly"],
    peso: 90,
    aiNativa: true,
  },

  // ── Perfilado y decisiones automatizadas (alto riesgo) ──────────────────────
  {
    proveedor: "Algolia (búsqueda predictiva)",
    tipo: "recomendador",
    scripts: ["algolia.net", "algoliasearch"],
    globals: ["algoliasearch"],
    peso: 25,
    aiNativa: true,
  },
  {
    proveedor: "Dynamic Yield",
    tipo: "recomendador",
    scripts: ["dynamicyield.com", "DynamicYield"],
    peso: 70,
    aiNativa: true,
  },
  {
    proveedor: "Nosto",
    tipo: "recomendador",
    scripts: ["nosto.com", "Nosto"],
    peso: 60,
    aiNativa: true,
  },
  {
    proveedor: "Algolia Recommend",
    tipo: "recomendador",
    scripts: ["algolia.net/recs"],
    peso: 55,
    aiNativa: true,
  },
];

/**
 * Patrones de texto que revelan un aviso de IA ya presente.
 * Buscamos una redacción que un humano entendería: "estás hablando con una IA".
 */
export const PATRONES_AVISO_IA: RegExp[] = [
  /\b(hablas|estás hablando|esta es una|estás hablando con|chateando con|interactuando con)\s+(con\s+)?(un|una|nuestro|nuestra|el|la)?\s*(asistente|bot|sistema|agente|chatbot|bot|ia)\b/i,
  /\bassistente\s+(virtual|de\s+ia|inteligencia\s+artificial)\b/i,
  /\b(bot|chatbot)\s+(de\s+)?(atención\s+al\s+cliente|de\s+soporte)?\s*(asistido\s+por\s+ia|con\s+ia|impulsado\s+por\s+ia|ai[-\s]?powered)\b/i,
  /\bpowered\s+by\s+(ai|artificial\s+intelligence|openai|chatgpt|claude|gemini)\b/i,
  /\bsistema\s+de\s+inteligencia\s+artificial\b/i,
  /\bmensajes?\s+(son\s+)?(generados|producidos|redactados)\s+por\s+(una\s+)?(ia|inteligencia\s+artificial|un\s+modelo)\b/i,
  /\bcontenido\s+(generado|creado|producido)\s+(por\s+)?(ia|inteligencia\s+artificial)\b/i,
  /\bcontenido\s+sint[eé]tico\b/i,
  /\bim[aá]genes?\s+(generadas?|creadas?)\s+(con|por)\s+ia\b/i,
  /\bno\s+hablas\s+con\s+una\s+persona\b/i,
  /\bno\s+est[aá]s\s+hablando\s+con\s+(una\s+)?persona\b/i,
  /\bai[-\s]?generated\b/i,
  /\bgenerated\s+by\s+(ai|ai\s+model|an\s+ai)\b/i,
  /\bthis\s+(is\s+)?an\s+ai[-\s]?(powered\s+)?(assistant|agent|bot|chatbot|system)\b/i,
  /\bdisclosure\s+of\s+ai\b/i,
];

/** Metaetiquetas o atributos que revelan marcado legible por máquina (Art. 50.2). */
export const PATRONES_MARCADO_MAQUINA: RegExp[] = [
  /<meta[^>]+name=["']?generator["']?[^>]+content=["'][^"']*(openai|chatgpt|dall-?e|midjourney|stable\s?diffusion|firefly|gemini|claude|copilot|leonardo|ideogram|flux|grok|llama|mistral|qwen|deepseek)/i,
  /<meta[^>]+content=["'][^"']*(openai|chatgpt|dall-?e|midjourney|stable\s?diffusion|gemini|claude)[^>]+name=["']?generator/i,
  /<meta[^>]+property=["']?og:ai_content_type["']/i,
  /data-ai-generated=["'](true|1|yes)/i,
  /data-content-type=["']ai[-_]generated/i,
  /<c2pa[^>]*>/i,
  /c2pa:/i,
  /<meta[^>]+name=["']?ai_disclosure["']/i,
  /<meta[^>]+name=["']?ai-content["']/i,
  /<meta[^>]+name=["']?["']?generated[-_]by["']?/i,
];

/** Páginas de transparencia / aviso legal que ya cumples. */
export const RUTAS_TRANSPARENCIA = [
  "/transparencia-ia",
  "/transparencia",
  "/ia-transparencia",
  "/cumplimiento-ia",
  "/politica-ia",
  "/aviso-ia",
  "/inteligencia-artificial",
  "/ai-transparency",
  "/ai-transparency-statement",
  "/ai-policy",
  "/transparency",
  "/compliance/ai",
  "/legal/ai-transparency",
  "/privacidad",
  "/politica-de-privacidad",
  "/legal",
  "/aviso-legal",
  "/informacion-legal",
];

/** Señales de que el contenido editorial está generado con IA. */
export const SENALES_TEXTO_IA: RegExp[] = [
  /\b(en\s+este\s+art[ií]culo|en\s+esta\s+gu[ií]a|delphi)\s+(te\s+)?(explicamos|explico|te\s+cuento)\b/i,
  /\b(es\s+importante\s+tener\s+en\s+cuenta\s+que)\b.*\b(advertencia|aviso)\b/i,
  /\ben\s+conclusi[oó]n\b.*\b(es\s+importante\s+recordar|en\s+resumen)\b/i,
  /\b(adem[aá]s,\s*)?es\s+fundamental\s+(comprender|entender|destacar)\b/i,
  /\b(optimizado|optimizado\s+para)\s+(motores\s+de\s+b[uú]squeda|SEO)\b/i,
  /\b(en\s+el\s+mundo\s+actual|en\s+la\s+era\s+de)\b.*\b(la\s+ia|inteligencia\s+artificial)\b/i,
  /\b(por\s+lo\s+tanto,\s*es\s+(crucial|fundamental|clave))\b/i,
];

export const SEVERIDAD_PESO: Record<string, number> = {
  critico: 25,
  alto: 15,
  medio: 8,
  bajo: 3,
  ok: 0,
};