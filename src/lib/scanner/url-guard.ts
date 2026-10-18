/**
 * Protección SSRF.
 *
 * Este endpoint recibe URLs de desconocidos: es el vector de ataque clásico
 * (SSRF contra la infraestructura de Vercel, metadatos de cloud, rangos privados).
 * Nada sale de aquí sin pasar por esta puerta.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

/** Rangos que nunca deben ser alcanzables desde un escáner público. */
const BLOCKED_IPV4 = [
  { start: 0, end: 16777215 }, // 0.0.0.0/8
  { start: 167772160, end: 184549375 }, // 10.0.0.0/8
  { start: 168430080, end: 168741375 }, // 100.64.0.0/10 (CGNAT)
  { start: 16925440, end: 16925440 }, // placeholder, 172.16 handled below
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

function isBlockedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true;
  // 0.0.0.0/8
  if (n <= 16777215) return true;
  // 10.0.0.0/8
  if (n >= 167772160 && n <= 184549375) return true;
  // 100.64.0.0/10
  if (n >= 168430080 && n <= 168741375) return true;
  // 127.0.0.0/8 (loopback)
  if (n >= 2130706432 && n <= 2147483647) return true;
  // 169.254.0.0/16 (link-local + metadatos de cloud)
  if (n >= 2852034560 && n <= 2852127231) return true;
  // 172.16.0.0/12
  if (n >= 2886729728 && n <= 2936012799) return true;
  // 192.168.0.0/16
  if (n >= 3232235776 && n <= 3232301055) return true;
  // 198.18.0.0/15 (benchmarking)
  if (n >= 3323068416 && n <= 3323199487) return true;
  // 224.0.0.0/4 (multicast) y 240.0.0.0/4 (reservado)
  if (n >= 3774873600) return true;
  void BLOCKED_IPV4;
  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split("%")[0];
  if (addr === "::" || addr === "::1") return true;
  if (addr.startsWith("fe80")) return true; // link-local
  if (/^f[cd]/.test(addr)) return true; // unique local fc00::/7
  if (addr.startsWith("::ffff:")) {
    const mapped = addr.replace("::ffff:", "");
    if (ipv4ToInt(mapped) !== null) return isBlockedIpv4(mapped);
  }
  return false;
}

export class UrlInvalida extends Error {
  constructor(public readonly motivo: string) {
    super(motivo);
    this.name = "UrlInvalida";
  }
}

/**
 * Normaliza y valida una URL de entrada.
 * Lanza UrlInvalida si no es apta para ser rastreada.
 */
export function validarUrl(entrada: string): URL {
  const bruto = (entrada || "").trim();

  if (!bruto) throw new UrlInvalida("Introduce una dirección web.");
  if (bruto.length > 2048) throw new UrlInvalida("La URL es demasiado larga.");

  // Cualquier esquema explícito que no sea http(s) se rechaza de frente.
  // Sin esto, "file:///etc/passwd" se convertiría en "https://file/...".
  const esquema = bruto.match(/^([a-z][a-z0-9+.-]*):\/\//i)?.[1]?.toLowerCase();
  if (esquema && esquema !== "http" && esquema !== "https") {
    throw new UrlInvalida("Solo se permiten direcciones http o https.");
  }

  // Aceptamos "ejemplo.es" y lo normalizamos a https://
  const conEsquema = /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`;

  let url: URL;
  try {
    url = new URL(conEsquema);
  } catch {
    throw new UrlInvalida("Esa dirección no es una URL válida.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlInvalida("Solo se permiten direcciones http o https.");
  }

  if (url.username || url.password) {
    throw new UrlInvalida("Las URLs con credenciales no están permitidas.");
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");

  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new UrlInvalida("Ese dominio no se puede escanear.");
  }
  if (host.endsWith(".local") || host.endsWith(".internal")) {
    throw new UrlInvalida("Ese dominio no se puede escanear.");
  }
  if (host === "169.254.169.254" || host === "metadata.google.internal") {
    throw new UrlInvalida("Ese destino no está permitido.");
  }

  if (ipv4ToInt(host) !== null) {
    if (isBlockedIpv4(host)) {
      throw new UrlInvalida("Esa IP no está permitida.");
    }
  } else if (host.includes(":")) {
    if (isBlockedIpv6(host)) {
      throw new UrlInvalida("Esa IP no está permitida.");
    }
  }

  // Filtro por extensión y puertos exóticos: casi siempre son falsos positivos.
  if (/\.(png|jpe?g|gif|svg|webp|avif|ico|pdf|zip|mp4|mp3|woff2?|ttf|css|js)$/i.test(url.pathname)) {
    throw new UrlInvalida("Esa URL no parece ser una página web.");
  }
  const port = url.port;
  if (port && !["80", "443", "8080", "8443", "3000"].includes(port)) {
    throw new UrlInvalida("Ese puerto no está permitido.");
  }

  url.hash = "";
  return url;
}

export function normalizarUrl(entrada: string): string {
  const u = validarUrl(entrada);
  u.pathname = u.pathname.replace(/\/+$/, "") || "/";
  return u.toString();
}