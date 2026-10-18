/**
 * Tipos centrales de SelloIA.
 *
 * El escaneo responde a una pregunta legal concreta y verificable:
 * ¿Esta web cumple el Artículo 50 del Reglamento (UE) 2024/1689?
 */

export type Severity = "critico" | "alto" | "medio" | "bajo" | "ok";

export type Articulo =
  | "art50.1" // Aviso al interactuar con un sistema de IA (chatbots, avatares)
  | "art50.2" // Marcado legible por máquina de salidas generativas
  | "art50.4" // Etiquetado de contenido sintético publicado por el despliegue
  | "art50.5" // Deepfakes y texto de interés público
  | "art4" // Alfabetización en IA del personal
  | "art26" // Obligaciones del responsable del despliegue
  | "gdpr"; // RGPD, Interacciones colaterales

export interface Hallazgo {
  id: string;
  articulo: Articulo;
  severity: Severity;
  titulo: string;
  descripcion: string;
  /** Evidencia real: qué se encontró exactamente en el HTML. */
  evidencia?: string;
  /** Qué hacer para arreglarlo. Accionable, no genérico. */
  solucion: string;
  /** Snippet listo para pegar. */
  snippet?: string;
}

export interface DeteccionIA {
  tipo:
    | "chatbot"
    | "avatar"
    | "voz"
    | "generador_contenido"
    | "recomendador"
    | "scoring";
  proveedor: string;
  /** Script o selector que ha delatado el sistema. */
  firma: string;
  pagina: string;
  /** ¿Se ha encontrado ya un aviso de IA alrededor? */
  conAviso: boolean;
}

export interface PaginaAnalizada {
  url: string;
  status: number;
  ok: boolean;
  titulo?: string;
  bytes: number;
}

export interface ResultadoScan {
  url: string;
  urlNormalizada: string;
  fecha: string; // ISO
  durationMs: number;
  score: number; // 0-100, 100 = pleno cumplimiento
  nivel: "critico" | "alto" | "medio" | "bajo";
  resumen: string;
  hallazgos: Hallazgo[];
  detecciones: DeteccionIA[];
  paginas: PaginaAnalizada[];
  stats: {
    paginasAnalizadas: number;
    sistemasIA: number;
    hallazgosCriticos: number;
    hallazgosAltos: number;
    cumplimientoArt50: boolean;
  };
}

export interface LegalPack {
  avisoChatbot: string;
  avisoGenerativo: string;
  paginaTransparencia: string;
  politicaInterna: string;
  snippetMarcado: string;
}