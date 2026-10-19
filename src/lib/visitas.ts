import "server-only";

/**
 * Registro de visitas, propio y de primera mano.
 *
 * Por qué no usar Vercel Analytics: se instaló y el componente no llegó a
 * inyectar su script, y los logs del plan Hobby no registran nada. Sin números
 * no hay forma de saber si algo de lo que se hace sirve para algo.
 *
 * Cómo se guarda, sin base de datos ni servicios de pago: un fichero JSON por
 * hora dentro del repositorio, vía la API de Contents de GitHub. Se elige una
 * fichero por hora en vez de uno único porque así dos peticiones que llegan en
 * el mismo minuto escriben sobre el mismo objeto y se resuelven con el `sha` que
 * devuelve GitHub, en lugar de pisarse.
 *
 * El coste es un viaje a la API por ventana de un minuto, no por visita.
 */

const REPO = process.env.GITHUB_REPO ?? "aandl-cyber/selloia";
const RAMA = process.env.GITHUB_RAMA ?? "main";
const BASE = `https://api.github.com/repos/${REPO}/contents/.datos/visitas`;

export interface Visita {
  /** Hora local de la visita, para agrupar. */
  ts: string;
  /** Fecha en formato dd/mm. */
  dia: string;
  ruta: string;
  /** Código ISO de dos letras del país, o "??". */
  pais: string;
  /** Dominio de referencia. */
  ref: string;
  movil: boolean;
  /** Identificador estable del visitante durante ese día. */
  uid: string;
}

interface Cubo {
  hora: string;
  total: number;
  porPais: Record<string, number>;
  porRuta: Record<string, number>;
  unicos: string[];
}

/** Ventana de agrupación: cuántos segundos acumulamos antes de escribir. */
const VENTANA_MS = 60_000;

// El estado vive en el módulo. En serverless cada instancia tiene el suyo, y por
// eso se usa el `sha` de GitHub al escribir: si otra instancia escribió mientras
// tanto, el sha no cuadra y se reintenta leyendo de nuevo.
let pendiente: Visita[] = [];
let ultimoVuelco = 0;
let escribiendo = false;

function rutaDeHora(claveHora: string): string {
  return `${BASE}/${claveHora}.json`;
}

/** Decodifica base64 de la API de GitHub. */
function decodificar(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf8");
}

async function token(): Promise<string> {
  const t = process.env.GITHUB_TOKEN;
  if (!t) throw new Error("GITHUB_TOKEN no configurado");
  return t;
}

/** Lee el cubo de una hora. Devuelve uno vacío si todavía no existe. */
async function leer(claveHora: string): Promise<Cubo> {
  const vacio: Cubo = { hora: claveHora, total: 0, porPais: {}, porRuta: {}, unicos: [] };
  const r = await fetch(rutaDeHora(claveHora), {
    headers: {
      Authorization: `Bearer ${await token()}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "selloia-visitas",
    },
  });
  if (r.status === 404) return vacio;
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  const j = await r.json();
  try {
    return { ...vacio, ...JSON.parse(decodificar(j.content)) };
  } catch {
    return vacio;
  }
}

async function escribir(claveHora: string, cubo: Cubo, sha: string | null, reintentos = 2): Promise<void> {
  const cuerpo = JSON.stringify(cubo, null, 0);
  const r = await fetch(rutaDeHora(claveHora), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${await token()}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "selloia-visitas",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `visitas ${claveHora}: ${cubo.total}`,
      content: Buffer.from(cuerpo, "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
    }),
  });

  // 409 = otra instancia escribió a la vez. Se relee y se reintenta fusionando.
  if (r.status === 409 && reintentos > 0) {
    const actual = await leer(claveHora);
    fusionar(actual, pendiente);
    pendiente = [];
    return escribir(claveHora, actual, null, reintentos - 1);
  }
  if (!r.ok && r.status !== 422) {
    throw new Error(`GitHub escritura ${r.status}`);
  }
}

function fusionar(cubo: Cubo, visitas: Visita[]): void {
  for (const v of visitas) {
    cubo.total += 1;
    cubo.porPais[v.pais] = (cubo.porPais[v.pais] ?? 0) + 1;
    cubo.porRuta[v.ruta] = (cubo.porRuta[v.ruta] ?? 0) + 1;
    if (!cubo.unicos.includes(v.uid)) cubo.unicos.push(v.uid);
  }
  // Sin isto, el fichero crece sin límite.
  if (cubo.unicos.length > 5000) cubo.unicos = cubo.unicos.slice(-5000);
}

/** Identificador estable del visitante durante un día, sin guardar la IP. */
function uidDe(ip: string, agente: string, dia: string): string {
  const h = [...`${dia}|${ip}|${agente}`].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
  return h.toString(36);
}

/**
 * Registra una visita y la vuelca a GitHub cuando toca.
 * Nunca lanza: perder una métrica no puede tumbar una web.
 */
export async function registrarVisita(datos: {
  ruta: string;
  ref: string;
  agente: string;
  ip: string;
  pais: string;
}): Promise<void> {
  try {
    const ahora = new Date();
    const claveHora = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(
      ahora.getDate()
    ).padStart(2, "0")}-${String(ahora.getHours()).padStart(2, "0")}`;

    pendiente.push({
      ts: ahora.toISOString(),
      dia: claveHora.slice(0, 10),
      ruta: datos.ruta.slice(0, 120),
      pais: (datos.pais || "??").toUpperCase().slice(0, 2),
      ref: datos.ref.slice(0, 120),
      movil: /mobile|android|iphone|ipad/i.test(datos.agente),
      uid: uidDe(datos.ip, datos.agente, claveHora.slice(0, 10)),
    });

    const toca = Date.now() - ultimoVuelco > VENTANA_MS;
    if (!toca || escribiendo || pendiente.length === 0) return;

    ultimoVuelco = Date.now();
    escribiendo = true;
    const lote = pendiente;
    pendiente = [];
    try {
      const cubo = await leer(claveHora);
      fusionar(cubo, lote);
      const r = await fetch(rutaDeHora(claveHora), { method: "GET", headers: { Authorization: `Bearer ${await token()}` } });
      const sha = r.ok ? (await r.json()).sha : null;
      await escribir(claveHora, cubo, sha);
    } finally {
      escribiendo = false;
    }
  } catch {
    /* una métrica perdida no es un incidente */
  }
}

/** Lista las claves de hora existentes, para que linacbericht las lea. */
export async function listarCubos(): Promise<string[]> {
  try {
    const r = await fetch(BASE, {
      headers: {
        Authorization: `Bearer ${await token()}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "selloia-visitas",
      },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j.filter((x) => x.type === "file" && x.name.endsWith(".json")).map((x) => x.name.replace(".json", "")) : [];
  } catch {
    return [];
  }
}

export async function leerCubo(claveHora: string): Promise<Cubo | null> {
  try {
    return await leer(claveHora);
  } catch {
    return null;
  }
}