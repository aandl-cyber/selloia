#!/usr/bin/env node
/**
 * Orquestador.
 *
 * Espera a que el descubrimiento termine, fusiona todos los prospectos con
 * email verificado, dedupa contra lo ya enviado y lanza el emisor autónomo.
 *
 * Así el proceso completo ocurre sin intervención: descubrir -> fusionar ->
 * enviar durante los días indicados.
 *
 * Uso: node scripts/orquestador.mjs --horas=120 --por-hora=13 --tope=95
 */

import { readFile, writeFile, existsSync } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const val = (n, d) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;

const HORAS = val("horas", "120");
const POR_HORA = val("por-hora", "13");
const TOPE = val("tope", "95");
const MAX_ESPERA_MIN = Number(val("espera-min", "45"));

const FUENTES = [
  "docs/outreach/cola-unificada.csv",
  "docs/outreach/prospects.csv",
  "docs/outreach/prospects-lote2.csv",
  "docs/outreach/prospectos-noche.csv",
  "docs/outreach/descubrimiento.csv",
];
const SALIDA = "docs/outreach/cola-envio.csv";
const ESTADO = ".datos/emisor-estado.json";

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

function parsear(t) {
  const lineas = t
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes(";"));
  if (!lineas.length) return [];
  const cab = lineas[0].split(";").map((v) => v.trim().toLowerCase());
  const datos = cab.includes("email") ? lineas.slice(1) : lineas;
  return datos.filter((l) => {
    const c = l.split(";").map((v) => v.trim());
    return (c[3] ?? "").includes("@") && !(c[3] ?? "").endsWith("example.com");
  });
}

(async () => {
  log("esperando a que el descubrimiento termine...");

  // El descubrimiento deja su CSV al final del log; aqui esperamos a que exista.
  const limiteEspera = Date.now() + MAX_ESPERA_MIN * 60_000;
  while (Date.now() < limiteEspera) {
    const descubrimientoExists = existsSync(path.join("docs", "outreach", "descubrimiento.csv"));
    const procesoVivo = await hayProceso("descubrimiento.mjs");
    if (descubrimientoExists || !procesoVivo) break;
    await dormir(60_000);
  }

  log("descubrimiento terminado. Fusionando...");

  const unicos = new Map();
  for (const f of FUENTES) {
    try {
      if (!existsSync(f)) continue;
      const filas = parsear(await readFile(f, "utf8"));
      for (const l of filas) {
        const email = l.split(";")[3].trim();
        if (!unicos.has(email)) unicos.set(email, l);
      }
      log(`  ${path.basename(f).padEnd(28)} ${filas.length} filas`);
    } catch (e) {
      log(`  ${f}: ${e.message}`);
    }
  }

  // Excluir lo ya enviado en campañas anteriores.
  let yaEnviados = [];
  try {
    if (existsSync(ESTADO)) {
      const e = JSON.parse(await readFile(ESTADO, "utf8"));
      yaEnviados = e.enviados ?? [];
    }
  } catch { /* primer arranque */ }

  const nuevos = [...unicos.entries()].filter(([email]) => !yaEnviados.includes(email));
  const cab = "empresa;dominio;nombre;email;evidencia;ruta";
  await writeFile(SALIDA, [cab, ...nuevos.map(([, l]) => l)].join("\n") + "\n", "utf8");

  log(`cola final: ${nuevos.length} pendientes (de ${unicos.size} únicos, ${yaEnviados.length} ya enviados antes)`);

  if (!nuevos.length) {
    log("nada que enviar. Terminando.");
    return;
  }

  log(`lanzando emisor autónomo: ${HORAS} h · ${POR_HORA}/hora · tope ${TOPE}/día`);

  const hijo = spawn(
    process.execPath,
    [
      "scripts/emisor-autonomo.mjs",
      `--cola=${SALIDA}`,
      `--horas=${HORAS}`,
      `--por-hora=${POR_HORA}`,
      `--tope-diario=${TOPE}`,
    ],
    { stdio: "inherit" }
  );

  hijo.on("exit", (code) => log(`emisor terminado con código ${code}`));
})();

async function hayProceso(nombre) {
  return new Promise((resolve) => {
    const p = spawn("cmd", ["/c", "tasklist", "/fo", "csv", "/nh"]);
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => {
      // No podemos saber que script corre; solo que hay procesos node.
      resolve(/node\.exe/i.test(out) ? true : false);
      void nombre;
    });
  });
}