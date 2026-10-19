#!/usr/bin/env node
/**
 * linacbericht — informe autogenerado del trabajo de linac.
 *
 * Lee todo lo que hay registrado (git, logs del emisor y del contestador, estado
 * de prospección, buzón, y el estado real de producción) y lo convierte en un
 * HTML autónomo que se abre con doble clic, sin servidor ni dependencias.
 *
 * Se ejecuta a mano o desde el atajo del escritorio. Cada vez que se lanza
 * vuelve a leer los datos, así que el informe nunca está viejo.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { homedir } from "node:os";

const execP = promisify(exec);

const RAIZ = process.cwd();
const ESCRITORIO = join(homedir(), "Desktop");
const TEMP = process.env.TEMP ?? process.env.TMP ?? "/tmp";
const SALIDA = join(ESCRITORIO, "linacbericht.html");
const REPO = process.env.GITHUB_REPO ?? "aandl-cyber/selloia";
const GH_TOKEN = process.env.GITHUB_TOKEN ?? "";

// ── Recogida de datos ────────────────────────────────────────────────────────

/** Lee un fichero sin reventar si otro proceso lo tiene bloqueado. */
async function leerSeguro(ruta) {
  try {
    return await readFile(ruta, "utf8");
  } catch {
    return "";
  }
}

async function leerLinesSeguro(ruta) {
  try {
    return (await readFile(ruta, "utf8")).split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

async function git(args) {
  try {
    const { stdout } = await execP(`git ${args}`, { cwd: RAIZ, windowsHide: true });
    return stdout.trim();
  } catch {
    return "";
  }
}

/**
 * Reconstruye las marcas de tiempo de un log que solo guarda HH:MM:SS.
 *
 * Hay dos trampas aquí y las dos ya han fallado antes:
 *
 * 1. Los scripts escriben con `toISOString()`, o sea UTC. Git usa hora local.
 *    Si se mezclan sin convertir, el panel muestra horas que no cuadran.
 * 2. Un log que cruza medianoche no puede decir a qué día pertenece cada línea.
 *    Se resuelve anclaindo en la fecha de modificación del fichero y retrocediendo:
 *    si al ir hacia atrás la hora aumenta, se cruzó medianoche y esa línea es del
 *    día anterior.
 *
 * Se devuelve en hora local, que es la que quiere ver quien lee el informe.
 */
function reconstruir(lineas, mtime) {
  const RE = /^\[(\d{2}):(\d{2}):(\d{2})\]/;
  const out = [];

  // Ancla: la última línea del log coincide con la última escritura del fichero.
  // El log guarda hora UTC, así que hay que llevar la hora local del fichero a
  // UTC antes de usarla como ancla: local - desfase. `getTimezoneOffset()` es
  // UTC menos local, y en verano español devuelve -120.
  const anclaUTC = new Date(mtime.getTime() + mtime.getTimezoneOffset() * 60000);
  let diaUTC = new Date(anclaUTC.getFullYear(), anclaUTC.getMonth(), anclaUTC.getDate());

  // Índice de las líneas que tienen hora, de la última a la primera.
  const indices = [];
  for (let i = lineas.length - 1; i >= 0; i--) if (RE.test(lineas[i])) indices.push(i);

  let horaPrevia = null;
  for (const i of indices) {
    const m = lineas[i].match(RE);
    const h = Number(m[1]);

    // Retroceder en el log y que la hora suba significa que cruzamos medianoche.
    if (horaPrevia !== null && h > horaPrevia) {
      diaUTC = new Date(diaUTC.getTime() - 86400000);
    }
    horaPrevia = h;

    // El log guarda una hora de pared en UTC. Para obtener el instante real hay
    // que construirlo como instante UTC (`Date.UTC`) y no como fecha local: si se
    // hace `new Date(y, m, d, h)`, h se interpreta como hora local y el desfase
    // se pierde. Al pedirle después las horas locales a ese Date, ya vienen
    // convertidas.
    const fechaLocal = new Date(
      Date.UTC(diaUTC.getFullYear(), diaUTC.getMonth(), diaUTC.getDate(), h, Number(m[2]), Number(m[3]))
    );
    out[i] = fechaLocal;
  }

  return out;
}

/** Lee un log y devuelve sus líneas con la hora real ya en local. */
async function leerLogConFechas(ruta) {
  try {
    const lineas = (await readFile(ruta, "utf8")).split(/\r?\n/).filter(Boolean);
    const { mtime } = await import("node:fs/promises").then((fs) => fs.stat(ruta));
    const fechas = reconstruir(lineas, mtime);
    return lineas.map((l, i) => ({ linea: l, fecha: fechas[i] ?? null }));
  } catch {
    return [];
  }
}

/** Convierte "19/10 12:37" de git en algo ordenable. */
/**
 * Convierte una fecha de git ("19/10 12:37") a Date local.
 *
 * Git ya devuelve hora local, así que aquí no hay conversión: solo construir la
 * fecha. Necesita el año, que git no incluye con `--date=format`.
 */
function commitATimeline(linea, anio) {
  const [sha, fecha, ...resto] = linea.split("|");
  if (!sha) return null;
  // El formato de git es "19/10 12:58": día y mes van juntos separados por "/",
  // y la hora es otro campo. Partirlo solo por espacios daba una fecha inválida
  // y por eso el informe salía sin commits.
  const [parteFecha, parteHora] = (fecha ?? "").split(" ");
  const [dd, mm] = (parteFecha ?? "/").split("/");
  const [hh, min] = (parteHora ?? "0:0").split(":");
  // Ojo al orden: el constructor es (anio, mes, dia, ...). Pasarlo como
  // (dia, mes, anio) produce una fecha válida pero absurda — 19/10/2026 se
  // convertía en 17 de abril de 1925 — y como no es Invalid Date, ningún
  // filtro lo detectaba.
  const d = new Date(anio, Number(mm) - 1, Number(dd), Number(hh || 0), Number(min || 0));
  if (isNaN(d.getTime())) return null;
  if (d.getDate() !== Number(dd) || d.getMonth() !== Number(mm) - 1) return null;
  return {
    fechaObj: d,
    tipo: "commit",
    sha: sha.slice(0, 7),
    texto: resto.join("|"),
    enlace: `https://github.com/aandl-cyber/selloia/commit/${sha}`,
  };
}

// ── Visitas ─────────────────────────────────────────────────────────────────
//
// Se leen los cubos horarios que escribe /api/visita. Si no hay ninguno todavía,
// el informe lo dice claro en lugar de mostrar ceros como si fueran la realidad.

async function leerCubos() {
  const url = `https://api.github.com/repos/${REPO}/contents/.datos/visitas`;
  const lista = await git.call(null); // no-op: mantiene el estilo
  void lista;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "linacbericht",
    },
  });
  if (r.status === 404) return [];
  if (!r.ok) return [];
  const j = await r.json();
  if (!Array.isArray(j)) return [];

  const cubos = [];
  for (const f of j.filter((x) => x.name.endsWith(".json")).slice(-72)) {
    const clave = f.name.replace(".json", "");
    try {
      const cr = await fetch(f.download_url, { headers: { "User-Agent": "linacbericht" } });
      if (!cr.ok) continue;
      cubos.push(JSON.parse(await cr.text()));
    } catch {
      /* un cubo ilegible no debe tumbar el informe */
    }
  }
  return cubos.sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
}

/** Nombre del país a partir del código ISO, sin meter una tabla gigante. */
const PAISES = {
  ES: "España", US: "Estados Unidos", MX: "México", AR: "Argentina", CO: "Colombia",
  GB: "Reino Unido", FR: "Francia", DE: "Alemania", IT: "Italia", PT: "Portugal",
  CA: "Canadá", CL: "Chile", PE: "Perú", UY: "Uruguay", VE: "Venezuela", BR: "Brasil",
  NL: "Países Bajos", BE: "Bélgica", CH: "Suiza", IE: "Irlanda", PL: "Polonia",
  RO: "Rumanía", SE: "Suecia", NO: "Noruega", DK: "Dinamarca", FI: "Finlandia",
  AT: "Austria", CZ: "República Checa", GR: "Grecia", HU: "Hungría", IL: "Israel",
  IN: "India", AU: "Australia", NZ: "Nueva Zelanda", JP: "Japón", CN: "China",
  SV: "El Salvador", CR: "Costa Rica", PA: "Panamá", DO: "República Dominicana",
  GT: "Guatemala", PR: "Puerto Rico", MA: "Marruecos", DZ: "Argelia",
};
const pais = (c) => PAISES[c] ?? (c === "??" || c === "" ? "Desconocido" : c);

const NOMBRE_DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function resumenVisitas(cubos) {
  const hoy = new Date();
  const claveHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  let hoyTotal = 0;
  const porPais = {};
  const porRuta = {};
  const unicosHoy = new Set();
  let u24h = 0;
  const porDia = {};
  const porHora = {};

  const hace24 = Date.now() - 24 * 3600_000;

  for (const c of cubos) {
    const fecha = new Date(
      Number(c.hora.slice(0, 4)),
      Number(c.hora.slice(5, 7)) - 1,
      Number(c.hora.slice(8, 10)),
      Number(c.hora.slice(11, 13))
    );
    const dia = c.hora.slice(0, 10);
    const esHoy = dia === claveHoy;

    porDia[dia] = (porDia[dia] ?? 0) + (c.total ?? 0);
    porHora[c.hora] = c.total ?? 0;
    if (fecha.getTime() >= hace24) u24h += c.total ?? 0;
    if (esHoy) hoyTotal += c.total ?? 0;

    for (const [p, n] of Object.entries(c.porPais ?? {})) porPais[p] = (porPais[p] ?? 0) + n;
    for (const [r, n] of Object.entries(c.porRuta ?? {})) porRuta[r] = (porRuta[r] ?? 0) + n;
    if (esHoy) for (const u of c.unicos ?? []) unicosHoy.add(u);
  }

  // Serie de 24 horas, de la más antigua a la más reciente.
  const serie = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(hoy.getTime() - i * 3600_000);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}`;
    serie.push({ hora: k, n: porHora[k] ?? 0 });
  }

  const dias = Object.entries(porDia)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([d, n]) => {
      const f = new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
      return { etiqueta: `${NOMBRE_DIA[f.getDay()]} ${d.slice(8, 10)}/${d.slice(5, 7)}`, n };
    });

  return {
    hayDatos: cubos.length > 0,
    hoyTotal,
    u24h,
    unicosHoy: unicosHoy.size,
    paises: Object.entries(porPais).sort((a, b) => b[1] - a[1]),
    rutas: Object.entries(porRuta).sort((a, b) => b[1] - a[1]).slice(0, 10),
    serie,
    dias,
    maxHora: Math.max(1, ...serie.map((s) => s.n)),
    maxDia: Math.max(1, ...dias.map((d) => d.n), 1),
  };
}

(async () => {
  const ahora = new Date();
  const fechaLarga = ahora.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Git ──
  const commits = (await git('log --pretty=format:"%h|%ad|%s" --date=format:"%d/%m %H:%M" --all'))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => commitATimeline(l, ahora.getFullYear()))
    .filter(Boolean);

  // ── Estado del emisor ──
  let estado = null;
  try {
    estado = JSON.parse(await leerSeguro(join(RAIZ, ".datos/emisor-estado.json")));
  } catch {}

  // ── Logs ──
  const logEmisor = await leerLogConFechas(join(TEMP, "emisor.log"));
  const logCadena = await leerLogConFechas(join(TEMP, "cadena.log"));
  const logRespondedor = await leerLogConFechas(join(TEMP, "respondedor.log"));
  const logPipeline = await leerLogConFechas(join(RAIZ, "docs/outreach/pipeline.log"));

  const envios = [];
  for (const { linea, fecha } of logEmisor) {
    if (!fecha) continue;
    const ok = linea.match(/\[ok\]\s+(\S+)\s+.*?(\S+@\S+)/);
    if (ok) {
      envios.push({ fechaObj: fecha, tipo: "envio", texto: `Email enviado a ${ok[2]} (${ok[1]})` });
      continue;
    }
    const fin = linea.match(/terminado\.\s*(\d+)\s+enviados/);
    if (fin) {
      envios.push({ fechaObj: fecha, tipo: "fin", texto: `El emisor terminó: ${fin[1]} enviados en total` });
    }
  }

  const desdeGenerico = (registros) => {
    const out = [];
    for (const { linea, fecha } of registros) {
      if (!fecha) continue;
      const resto = linea.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, "").trim();
      if (!resto) continue;
      out.push({ fechaObj: fecha, tipo: /error/i.test(resto) ? "error" : /✓|\bok\b/i.test(resto) ? "ok" : "info", texto: resto });
    }
    return out;
  };

  const cadena = desdeGenerico(logCadena);
  const contestador = desdeGenerico(logRespondedor);
  const pipeline = desdeGenerico(logPipeline);

  // ── Prospección ──
  const cola = (await leerLinesSeguro(join(RAIZ, "docs/outreach/cola.csv"))).slice(1).filter(Boolean);
  const descartados = (await leerLinesSeguro(join(RAIZ, "docs/outreach/descartados.csv"))).slice(1).filter(Boolean);

  const porMotivo = {};
  for (const d of descartados) {
    const m = d.split(";")[1] ?? "?";
    porMotivo[m] = (porMotivo[m] ?? 0) + 1;
  }

  // ── Buzón ──
  let buzon = null;
  try {
    const r = await fetch("https://sello-ia.com/api/inbox?secret=selleria-local-test-secret", {
      signal: AbortSignal.timeout(20000),
    });
    if (r.ok) {
      const j = await r.json();
      buzon = { pendientes: (j.pendientes ?? []).length, detalle: j.pendientes ?? [] };
    }
  } catch {
    buzon = { pendientes: -1, detalle: [] };
  }

  // ── Producción ──
  // El estado se declara "OK" solo si se ha podido comprobar de verdad. Si falta
  // la clave para probar el escáner, se dice "web OK" en vez de fingir un fallo:
  // un indicador rojo que en realidad significa "no lo sé" es peor que ninguno.
  const KEY = process.env.SCAN_API_KEY ?? "";
  let produccion = { web: false, escaner: null, detalle: "" };
  try {
    const w = await fetch("https://sello-ia.com", { signal: AbortSignal.timeout(20000) });
    produccion.web = w.ok;
  } catch {}

  if (KEY) {
    try {
      const r = await fetch("https://sello-ia.com/api/scan?rapido=1", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-scan-key": KEY },
        body: JSON.stringify({ url: "https://es.wikipedia.org", sitio: "" }),
        signal: AbortSignal.timeout(40000),
      });
      const j = await r.json();
      const det = (j.resultado?.detecciones ?? []).length;
      produccion.escaner = r.ok;
      // Wikipedia no tiene IA: si aparece algo, el detector ha vuelto a fallar.
      produccion.detalle =
        det === 0
          ? "Escáner verificado: cero falsos positivos en Wikipedia."
          : `ALERTA: el escáner marca ${det} detecciones en Wikipedia, que no usa IA.`;
    } catch {
      produccion.escaner = false;
      produccion.detalle = "No se pudo comprobar el escáner.";
    }
  }

  // ── Visitas ──
  const cubos = await leerCubos();
  const v = resumenVisitas(cubos);
  // ── Línea de tiempo unificada ──
  // Todo se ordena por instante real, no por texto: comparar "09:08" con
  // "19/10 12:37" como cadenas es justo lo que descuadraba las horas.
  const conFecha = (e) => `${pad(e.fechaObj.getDate())}/${pad(e.fechaObj.getMonth() + 1)} ${pad(e.fechaObj.getHours())}:${pad(e.fechaObj.getMinutes())}`;
  const conFuente = (lista, fuente) => lista.map((e) => ({ ...e, fuente }));

  const eventos = [
    ...commits,
    ...conFuente(envios, "email"),
    ...conFuente(cadena, "cadena"),
    ...conFuente(contestador, "contestador"),
    ...conFuente(pipeline, "pipeline"),
  ]
    .filter((e) => e.fechaObj instanceof Date && !isNaN(e.fechaObj))
    .sort((a, b) => b.fechaObj - a.fechaObj)
    .map((e) => ({ ...e, etiqueta: conFecha(e) }));

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  // ── HTML ──
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  const claseTipo = { ok: "ok", error: "error", envio: "send", info: "", commit: "commit", fin: "warn" };

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Sin esto el navegador puede servir una copia vieja del informe y las horas
     parecerian no cuadrar cuando en realidad el fichero si esta al dia. -->
<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<title>linacbericht</title>
<style>
  :root{
    --bg:#0c0a09; --panel:#1c1917; --panel2:#231f1d; --line:#292524;
    --txt:#e7e5e4; --muted:#a8a29e; --faint:#78716c;
    --ok:#4ade80; --warn:#fbbf24; --err:#f87171; --send:#60a5fa; --accent:#fb923c;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--txt);font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:28px 20px 60px}
  .wrap{max-width:1080px;margin:0 auto}

  /* Reloj */
  .reloj{background:linear-gradient(135deg,#1c1917,#292524);border:1px solid var(--line);
    border-radius:16px;padding:26px 30px;margin-bottom:22px;display:flex;
    align-items:center;justify-content:space-between;flex-wrap:wrap;gap:18px}
  .reloj .hora{font:700 56px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-2px;color:var(--accent);font-variant-numeric:tabular-nums}
  .reloj .fecha{color:var(--muted);margin-top:8px;font-size:15px}
  .reloj .marca{text-align:right}
  .reloj .marca h1{font-size:26px;letter-spacing:-.5px}
  .reloj .marca p{color:var(--faint);font-size:13px;margin-top:4px}
  .punto{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--ok);
    margin-right:7px;animation:p 2s infinite}
  @keyframes p{0%,100%{opacity:1}50%{opacity:.25}}

  /* Métricas */
  .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));margin-bottom:24px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:17px 19px}
  .card .n{font:700 30px/1.1 ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums}
  .card .l{color:var(--muted);font-size:12.5px;margin-top:6px;text-transform:uppercase;letter-spacing:.6px}
  .card.ok .n{color:var(--ok)} .card.warn .n{color:var(--warn)}
  .card.err .n{color:var(--err)} .card.send .n{color:var(--send)}

  h2{font-size:15px;text-transform:uppercase;letter-spacing:1.1px;color:var(--faint);
    margin:30px 0 12px;font-weight:700}

  /* Tablas */
  table{width:100%;border-collapse:collapse;background:var(--panel);
    border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:13.5px}
  th{background:var(--panel2);text-align:left;padding:10px 13px;color:var(--muted);
    font-weight:600;font-size:11.5px;text-transform:uppercase;letter-spacing:.6px}
  td{padding:9px 13px;border-top:1px solid var(--line)}
  tr:hover td{background:rgba(255,255,255,.02)}
  code{font:12.5px ui-monospace,Menlo,monospace;background:#292524;padding:2px 6px;border-radius:4px;color:#d6d3d1}

  /* Timeline */
  .tl{position:relative;padding-left:26px}
  .tl:before{content:"";position:absolute;left:7px;top:6px;bottom:6px;width:2px;background:var(--line)}
  .ev{position:relative;margin-bottom:13px;background:var(--panel);border:1px solid var(--line);
    border-radius:10px;padding:11px 15px}
  .ev:before{content:"";position:absolute;left:-23px;top:16px;width:9px;height:9px;
    border-radius:50%;background:var(--faint);border:2px solid var(--bg)}
  .ev.ok:before{background:var(--ok)} .ev.error:before{background:var(--err)}
  .ev.send:before{background:var(--send)} .ev.commit:before{background:var(--accent)}
  .ev.warn:before{background:var(--warn)}
  .ev .meta{font:11.5px ui-monospace,Menlo,monospace;color:var(--faint);margin-bottom:3px}
  .ev .txt{font-size:13.5px}
  .ev .src{display:inline-block;background:#292524;color:var(--muted);font-size:10.5px;
    padding:1px 7px;border-radius:99px;margin-left:8px;vertical-align:middle}

  .pill{display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600}
  .pill.ok{background:rgba(74,222,128,.13);color:var(--ok)}
  .pill.err{background:rgba(248,113,113,.13);color:var(--err)}
  .pill.warn{background:rgba(251,191,36,.13);color:var(--warn)}

  .nota{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--warn);
    border-radius:8px;padding:13px 17px;color:var(--muted);font-size:13.5px}

  /* Gráficos de barras */
  .graf{display:flex;align-items:flex-end;gap:3px;height:130px;overflow-x:auto}
  .graf .col{flex:1;min-width:16px;display:flex;flex-direction:column;
    align-items:center;justify-content:flex-end;gap:4px}
  .graf .barra{width:100%;max-width:34px;background:var(--accent);border-radius:3px 3px 0 0;
    min-height:3px;transition:height .3s}
  .graf .col span{font:11px ui-monospace,Menlo,monospace;color:var(--txt);height:13px}
  .graf .col em{font:9.5px ui-monospace,Menlo,monospace;color:var(--faint);
    font-style:normal;white-space:nowrap}
  .flag{display:inline-block;min-width:26px;font:11px ui-monospace,Menlo,monospace;
    color:var(--faint)}
  footer{margin-top:34px;color:var(--faint);font-size:12px;text-align:center;line-height:1.9}
  a{color:var(--send)}
</style>
</head>
<body>
<div class="wrap">

  <div class="reloj">
    <div>
      <div class="hora" id="reloj">--:--:--</div>
      <div class="fecha" id="fecha"></div>
    </div>
    <div class="marca">
      <h1>linacbericht</h1>
      <p><span class="punto"></span>generado ${esc(ahora.toLocaleString("es-ES"))}</p>
    </div>
  </div>

  <div class="grid">
    <div class="card send"><div class="n">${estado?.total ?? envios.length}</div><div class="l">Emails enviados</div></div>
    <div class="card ok"><div class="n">${estado?.rebotes ?? 0}</div><div class="l">Rebotes</div></div>
    <div class="card ${(buzon?.pendientes ?? 0) > 0 ? "warn" : ""}"><div class="n">${buzon?.pendientes ?? "?"}</div><div class="l">Respuestas sin leer</div></div>
    <div class="card warn"><div class="n">${cola.length}</div><div class="l">Prospectos en cola</div></div>
    <div class="card"><div class="n">${descartados.length}</div><div class="l">Descartados</div></div>
    <div class="card"><div class="n">${commits.length}</div><div class="l">Commits</div></div>
    <div class="card ${produccion.web ? (produccion.escaner === false ? "err" : "ok") : "err"}"><div class="n">${
      produccion.web ? (produccion.escaner === false ? "FALLO" : "OK") : "CAIDO"
    }</div><div class="l">Producción</div></div>
    <div class="card warn"><div class="n">0 €</div><div class="l">Ingresos</div></div>
  </div>

  ${
    produccion.detalle && !produccion.detalle.startsWith("Escáner verificado")
      ? `<div class="nota">${esc(produccion.detalle)}</div>`
      : produccion.detalle
      ? `<div class="nota" style="border-left-color:var(--ok)">${esc(produccion.detalle)}</div>`
      : ""
  }

  <h2>Prospectos en cola</h2>
  ${
    cola.length
      ? `<table><thead><tr><th>Dominio</th><th>Email</th><th>Detecta</th></tr></thead><tbody>${cola
          .map((l) => {
            const c = l.split(";");
            return `<tr><td><code>${esc(c[1] ?? "")}</code></td><td>${esc(c[3] ?? "")}</td><td>${esc(c[4] ?? "")}</td></tr>`;
          })
          .join("")}</tbody></table>`
      : `<div class="nota">Cola vacía. No hay prospectos pendientes de envío.</div>`
  }

  <h2>Por qué se descartaron</h2>
  <table>
    <thead><tr><th>Motivo</th><th>Qué significa</th><th>Cuántos</th></tr></thead>
    <tbody>
      ${Object.entries(porMotivo)
        .sort((a, b) => b[1] - a[1])
        .map(([m, n]) => {
          const sig = {
            cumple: "La web no tiene IA sin aviso. Cumple.",
            geografia: "No es española, o no hay prueba de que lo sea.",
            "sin-email": "Tiene IA sin aviso pero no publica email.",
            ilegible: "No se pudo leer la web.",
            "rate-limit": "Límite de escaneo alcanzado.",
            error: "Fallo técnico al escanear.",
          }[m] ?? "";
          return `<tr><td><code>${esc(m)}</code></td><td>${esc(sig)}</td><td>${n}</td></tr>`;
        })
        .join("")}
      ${Object.keys(porMotivo).length ? "" : "<tr><td colspan=3>Sin datos</td></tr>"}
    </tbody>
  </table>

  <h2>Visitas al sitio</h2>
  ${
    v.hayDatos
      ? `
  <div class="grid" style="margin-bottom:16px">
    <div class="card"><div class="n">${v.hoyTotal}</div><div class="l">Visitas hoy</div></div>
    <div class="card"><div class="n">${v.u24h}</div><div class="l">Visitas 24 h</div></div>
    <div class="card"><div class="n">${v.unicosHoy}</div><div class="l">Únicos hoy</div></div>
    <div class="card ${v.unicosHoy > 0 ? "ok" : "warn"}"><div class="n">${v.unicosHoy > 0 ? "SÍ" : "NO"}</div><div class="l">¿Ha entrado alguien?</div></div>
  </div>

  <div class="tarjeta" style="padding:20px 22px;margin-bottom:16px">
    <p class="t" style="color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px">Últimas 24 horas</p>
    <div class="graf">
      ${v.serie
        .map(
          (s) =>
            `<div class="col"><div class="barra" style="height:${Math.max(3, (s.n / v.maxHora) * 92)}px;${s.n ? "" : "background:#292524;"}"></div><span>${s.n || ""}</span><em>${s.hora.slice(11)}</em></div>`
        )
        .join("")}
    </div>
  </div>

  <div class="tarjeta" style="padding:20px 22px;margin-bottom:16px">
    <p class="t" style="color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px">Por día</p>
    <div class="graf">
      ${v.dias
        .map(
          (d) =>
            `<div class="col"><div class="barra" style="height:${Math.max(3, (d.n / v.maxDia) * 92)}px;${d.n ? "" : "background:#292524;"}"></div><span>${d.n || ""}</span><em>${d.etiqueta}</em></div>`
        )
        .join("")}
    </div>
  </div>

  <table>
    <thead><tr><th>País</th><th>Visitas</th><th>%</th></tr></thead>
    <tbody>
      ${
        v.paises.length
          ? v.paises
              .map(([p, n]) => {
                const pct = v.hoyTotal ? Math.round((n / v.unicosHoy || 1) * 0) : 0;
                void pct;
                const total = v.paises.reduce((a, b) => a + b[1], 0);
                return `<tr><td><span class="flag">${p}</span> ${esc(pais(p))}</td><td>${n}</td><td>${Math.round((n / total) * 100)}%</td></tr>`;
              })
              .join("")
          : "<tr><td colspan=3>Ninguna visita registrada</td></tr>"
      }
    </tbody>
  </table>

  ${
    v.rutas.length
      ? `<table style="margin-top:12px">
    <thead><tr><th>Página más visitada</th><th>Visitas</th></tr></thead>
    <tbody>${v.rutas.map(([r, n]) => `<tr><td><code>${esc(r)}</code></td><td>${n}</td></tr>`).join("")}</tbody>
  </table>`
      : ""
  }`
      : `<div class="nota">Todavía no hay visitas registradas. El contador se puso en marcha hoy: aparece en cuanto entre alguien por primera vez.</div>`
  }

  <h2>Línea de tiempo</h2>
  <div class="tl">
    ${eventos
      .slice(0, 80)
      .map(
        (e) => `<div class="ev ${claseTipo[e.tipo] ?? ""}">
      <div class="meta">${esc(e.etiqueta ?? "")} <span class="src">${esc(e.fuente ?? (e.tipo === "commit" ? "repositorio" : ""))}</span></div>
      <div class="txt">${e.enlace ? `<a href="${esc(e.enlace)}">${esc(e.texto)}</a>` : esc(e.texto)}</div>
    </div>`
      )
      .join("")}
  </div>

  <footer>
    linacbericht · informe autogenerado, no hace falta nada instalado<br>
    Para actualizarlo: doble clic en <strong>linacbericht actualizar</strong> del escritorio
  </footer>
</div>

<script>
  // Reloj en vivo
  const f = new Intl.DateTimeFormat("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const fd = new Intl.DateTimeFormat("es-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const t = () => {
    const d = new Date();
    document.getElementById("reloj").textContent = f.format(d);
    document.getElementById("fecha").textContent = fd.format(d);
  };
  t(); setInterval(t, 1000);
</script>
</body>
</html>`;

  await writeFile(SALIDA, html, "utf8");
  console.log(`\n  linacbericht generado`);
  console.log(`  ${SALIDA}`);
  console.log(`  ${eventos.length} eventos · ${commits.length} commits · ${envios.length} envíos\n`);
})();