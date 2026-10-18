import "server-only";
import crypto from "node:crypto";

/**
 * Bandeja de entrada.
 *
 * Flujo:
 *   Resend (inbound)  →  POST /api/inbox  →  GitHub Issue  →  yo lo leo por API
 *   yo respondo       →  Resend (outbound)
 *
 * Se usa GitHub Issues como almacén porque ya tenemos token con alcance `repo`:
 * es persistente, gratuit y no exige montar una base de datos para el MVP.
 *
 * En cuanto haya volumen esto se sustituye por una tabla de verdad; la interfaz
 * pública (`POST /api/inbox` y `POST /api/reply`) no cambia.
 */

const REPO = process.env.GITHUB_REPO ?? "aandl-cyber/selloia";
const ETIQUETA = "inbound";

interface MensajeEntrante {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  /** Cabecera Message-ID del remitente, para encadenar el hilo. */
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: { filename?: string; contentType?: string }[];
}

function token(): string {
  const t = process.env.GITHUB_TOKEN;
  if (!t) throw new Error("GITHUB_TOKEN no configurado");
  return t;
}

async function gh<T>(ruta: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "selloia-inbox",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub ${res.status}: ${t.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

function htmlAPlano(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Normaliza el payload que Resend entrega en un inbound webhook. */
export function normalizarEntrante(cuerpo: unknown): MensajeEntrante | null {
  if (!cuerpo || typeof cuerpo !== "object") return null;
  const c = cuerpo as Record<string, unknown>;

  const from = String(c.from ?? "").trim();
  const to = String(c.to ?? "").trim();
  const subject = String(c.subject ?? "(sin asunto)").trim();

  if (!from || !to) return null;

  return {
    from,
    fromName: typeof c.from_name === "string" ? c.from_name : undefined,
    to,
    subject,
    text: typeof c.text === "string" ? c.text : undefined,
    html: typeof c.html === "string" ? c.html : undefined,
    messageId: typeof c.message_id === "string" ? c.message_id : undefined,
    inReplyTo: typeof c.in_reply_to === "string" ? c.in_reply_to : undefined,
    references: typeof c.references === "string" ? c.references : undefined,
    attachments: Array.isArray(c.attachments)
      ? (c.attachments as { filename?: string; contentType?: string }[])
      : undefined,
  };
}

/**
 * Verifica la firma del webhook de Resend (esquema Svix).
 *
 * Resend delega el envío de webhooks entrantes en Svix, que firma con
 * `svix-id`, `svix-timestamp` y `svix-signature` sobre
 * `<svix-id>.<svix-timestamp>.<cuerpo>`. El secreto es base64.
 *
 * Sin esta comprobación, cualquiera que conozca la URL podría inyectar emails
 * falsos en la bandeja ystalo de una respuesta nuestra.
 */
export async function verificarFirmaResend(
  cuerpo: string,
  cabeceras: { svixId?: string | null; svixTimestamp?: string | null; svixSignature?: string | null },
  toleranciaSegundos = 300
): Promise<boolean> {
  const secreto = process.env.RESEND_WEBHOOK_SECRET;
  const { svixId, svixTimestamp, svixSignature } = cabeceras;

  if (!secreto || !svixId || !svixTimestamp || !svixSignature) return false;

  // Ventana anti-replay: un webhook capturado no vale para siempre.
  const edad = Math.abs(Date.now() / 1000 - Number(svixTimestamp));
  if (!Number.isFinite(edad) || edad > toleranciaSegundos) return false;

  const bytes = Buffer.from(secreto.replace(/^whsec_/, ""), "base64");
  if (bytes.length === 0) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const esperado = createHmac("sha256", bytes)
    .update(`${svixId}.${svixTimestamp}.${cuerpo}`, "utf8")
    .digest("base64");

  // Svix envia "v1,<firma>" y puede encadenar varias versiones separadas por espacio.
  const candidatas = svixSignature.split(" ");
  for (const c of candidatas) {
    const [, firma] = c.split(",");
    if (!firma) continue;
    const a = Buffer.from(esperado, "utf8");
    const b = Buffer.from(firma, "utf8");
    if (a.length !== b.length) continue;
    if (timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** Publica el mensaje como Issue para que quede accesible y auditable. */
export async function registrar(m: MensajeEntrante): Promise<{ numero: number; url: string }> {
  const cuerpo = (m.text?.trim() || htmlAPlano(m.html)) || "(sin cuerpo)";
  const ref = Math.random().toString(36).slice(2, 10);

  const cuerpoIssue = [
    `**De:** ${m.fromName ? `${m.fromName} <${m.from}>` : m.from}`,
    `**Para:** ${m.to}`,
    `**Asunto:** ${m.subject}`,
    m.messageId ? `**Message-ID:** \`${m.messageId}\`` : "",
    m.inReplyTo ? `**In-Reply-To:** \`${m.inReplyTo}\`` : "",
    "",
    "---",
    "",
    cuerpo.slice(0, 60_000),
    "",
    "---",
    `<sub>ref: \`${ref}\` · registrado automáticamente por SelloIA</sub>`,
  ]
    .filter(Boolean)
    .join("\n");

  const issue = await gh<{ number: number; html_url: string }>(
    `/repos/${REPO}/issues`,
    {
      method: "POST",
      body: JSON.stringify({
        title: `[Email] ${m.subject} — ${m.from}`,
        body: cuerpoIssue,
        labels: [ETIQUETA],
      }),
    }
  );

  return { numero: issue.number, url: issue.html_url };
}

/**
 * Envía una respuesta.
 * Encadena el hilo con In-Reply-To y References para que el cliente lo vea
 * agrupado en su cliente de correo, que es lo que hace que responda.
 */
export async function responder(opts: {
  para: string;
  asunto: string;
  html: string;
  inReplyTo?: string;
  references?: string;
}): Promise<{ id: string }> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) throw new Error("RESEND_API_KEY no configurado");

  const cabecerasExtra: Record<string, string> = {};
  if (opts.inReplyTo) cabecerasExtra["In-Reply-To"] = opts.inReplyTo;
  if (opts.references ?? opts.inReplyTo) {
    cabecerasExtra["References"] = opts.references ?? opts.inReplyTo!;
  }

  const payload: Record<string, unknown> = {
    from: process.env.RESEND_FROM ?? "SelloIA <hola@sello-ia.com>",
    to: [opts.para],
    subject: opts.asunto,
    html: opts.html,
  };
  if (Object.keys(cabecerasExtra).length) payload.headers = cabecerasExtra;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const texto = await res.text();
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${texto.slice(0, 300)}`);
  }
  return JSON.parse(texto) as { id: string };
}

/** Lee las issues de entrada pendientes de responder. */
export async function listarPendientes(): Promise<
  { numero: number; titulo: string; url: string; abierto: boolean }[]
> {
  const issues = await gh<
    { number: number; title: string; html_url: string; state: string }[]
  >(`/repos/${REPO}/issues?state=open&labels=${ETIQUETA}&per_page=50`);

  return issues
    // GitHub devuelve también los PRs en /issues; los filtramos.
    .filter((i) => !i.title.toLowerCase().startsWith("pull request"))
    .map((i) => ({
      numero: i.number,
      titulo: i.title,
      url: i.html_url,
      abierto: i.state === "open",
    }));
}

export function idDeHilo(messageId?: string): string {
  return messageId ? crypto.createHash("sha1").update(messageId).digest("hex").slice(0, 10) : "";
}