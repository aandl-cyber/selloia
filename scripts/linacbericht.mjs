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

/** Línea del log del emisor con su marca de tiempo ya interpretada. */
function parsearLogEmisor(lineas) {
  const out = [];
  const hora = /^\[(\d{2}:\d{2}:\d{2})\]/;
  for (const l of lineas) {
    const m = l.match(hora);
    if (!m) continue;
    const ok = l.match(/\[ok\]\s+(\S+)\s+.*?(\S+@\S+)/);
    if (ok) {
      out.push({ t: m[1], tipo: "envio", texto: `Email enviado a ${ok[2]} (${ok[1]})`, ref: ok[1] });
      continue;
    }
    const fin = l.match(/terminado\.\s*(\d+)\s+enviados/);
    if (fin) out.push({ t: m[1], tipo: "fin", texto: `El emisor terminó: ${fin[1]} enviados en total` });
  }
  return out;
}

function parsearLogGenerico(lineas, tipoPorDefecto = "info") {
  const out = [];
  const hora = /^\[(\d{2}:\d{2}:\d{2})\]/;
  for (const l of lineas) {
    const m = l.match(hora);
    if (!m) continue;
    const resto = l.replace(hora, "").replace(/^\]\s*/, "").trim();
    if (!resto) continue;
    const tipo = /error/i.test(resto) ? "error" : /✓|ok/i.test(resto) ? "ok" : tipoPorDefecto;
    out.push({ t: m[1], tipo, texto: resto });
  }
  return out;
}

/** Convierte "19/10 12:37" de git en algo ordenable. */
function commitATimeline(linea) {
  const [sha, fecha, ...resto] = linea.split("|");
  if (!sha) return null;
  const [dd, mm, hh] = (fecha ?? "").split(" ");
  return {
    t: hh ?? "",
    fecha: `${dd}/${mm}`,
    tipo: "commit",
    sha: sha.slice(0, 7),
    texto: resto.join("|"),
    enlace: `https://github.com/aandl-cyber/selloia/commit/${sha}`,
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
    .map(commitATimeline)
    .filter(Boolean);

  // ── Estado del emisor ──
  let estado = null;
  try {
    estado = JSON.parse(await leerSeguro(join(RAIZ, ".datos/emisor-estado.json")));
  } catch {}

  // ── Logs ──
  const lineasEmisor = await leerLinesSeguro(join(TEMP, "emisor.log"));
  const lineasCadena = await leerLinesSeguro(join(TEMP, "cadena.log"));
  const lineasRespondedor = await leerLinesSeguro(join(TEMP, "respondedor.log"));
  const lineasPipeline = await leerLinesSeguro(join(RAIZ, "docs/outreach/pipeline.log"));

  const envios = parsearLogEmisor(lineasEmisor);
  const cadena = parsearLogGenerico(lineasCadena);
  const contestador = parsearLogGenerico(lineasRespondedor);
  const pipeline = parsearLogGenerico(lineasPipeline);

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

  // ── Línea de tiempo unificada ──
  const eventos = [
    ...commits.map((c) => ({ ...c, orden: c.fecha + " " + c.t, fuente: "repositorio" })),
    ...envios.map((e) => ({ ...e, orden: e.t, fuente: "email", fecha: fechaCorta(ahora) })),
    ...cadena.map((e) => ({ ...e, orden: e.t, fuente: "cadena", fecha: fechaCorta(ahora) })),
    ...contestador.map((e) => ({ ...e, orden: e.t, fuente: "contestador", fecha: fechaCorta(ahora) })),
    ...pipeline.map((e) => ({ ...e, orden: e.t, fuente: "pipeline", fecha: fechaCorta(ahora) })),
  ].sort((a, b) => String(b.orden).localeCompare(String(a.orden)));

  function fechaCorta(d) {
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
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

  <h2>Línea de tiempo</h2>
  <div class="tl">
    ${eventos
      .slice(0, 80)
      .map(
        (e) => `<div class="ev ${claseTipo[e.tipo] ?? ""}">
      <div class="meta">${esc(e.fecha ?? "")} ${esc(e.t ?? "")} <span class="src">${esc(e.fuente ?? "")}</span></div>
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