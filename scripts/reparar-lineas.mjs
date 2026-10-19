#!/usr/bin/env node
/**
 * Repara líneas concretas de un fichero sustituyéndolas enteras.
 *
 * UTF-8, edición por número de línea: no depende de encontrar el texto
 * corrupto, que es justo lo que falla cuando los caracteres dañados no son
 * los que uno cree.
 */

import { readFileSync, writeFileSync } from "node:fs";

const FICHERO = process.argv[2];
if (!FICHERO) {
  console.error("uso: node reparar-lineas.mjs <fichero>");
  process.exit(1);
}

const REGLAS = [
  {
    linea: 522,
    limpia:
      '        a: "No, si ese sistema no decide sobre las condiciones de trabajo de la plantilla. El Decreto se refiere a sistemas algoritmicos o automatizados que toman decisiones sobre aspectos del trabajo: sueldos, presupuestos, evaluaciones, turnos, ascensos o descartes de candidaturas. Un chatbot que atiende clientes es otra obligacion, la del Articulo 50 del Reglamento Europeo de IA.",',
  },
  {
    linea: 584,
    limpia:
      "          analizarian atributos sensibles. La Agencia respondio con tres condiciones que conviene",
  },
  {
    linea: 589,
    limpia:
      '            "Evaluacion de impacto (EIPD) ANTES de tratar los datos, no despues.",',
  },
];

const lineas = readFileSync(FICHERO, "utf8").split(/\r?\n/);

for (const r of REGLAS) {
  const i = r.linea - 1;
  const antes = lineas[i] ?? "";
  const sucia = /[\u3000-\u9FFF\uFF00-\uFFEF]/.test(antes);
  lineas[i] = r.limpia;
  console.log(
    `  linea ${r.linea}: ${sucia ? "corrupta -> corregida" : "reemplazada"}`
  );
  if (sucia) console.log(`    antes: ${antes.trim().slice(0, 90)}`);
}

writeFileSync(FICHERO, lineas.join("\n"), "utf8");

const final = readFileSync(FICHERO, "utf8");
const cjk = (final.match(/[\u3000-\u9FFF\uFF00-\uFFEF]/g) ?? []).length;
console.log(`\n  CJK restantes en el fichero: ${cjk}`);
process.exit(cjk === 0 ? 0 : 1);