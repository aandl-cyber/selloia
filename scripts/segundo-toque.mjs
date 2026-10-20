/**
 * Segunda oportunidad para la primera campaña: re-escaneo con el escáner ya
 * corregido y filtro España.
 *
 * Por qué existe: a la primera tanda se le escribió con el escáner de antes,
 * que se tragaba enlaces salientes por falso positivo. Nadie contestó. Antes
 * de plantear un segundo toque hay que responder dos preguntas con hechos:
 *
 *   1. ¿Sigue cumpliendo la denuncia? Solo se reescribe a quien, con el
 *      escáner corregido HOY, siga teniendo IA visible sin aviso. Decirle a
 *      alguien "tu web incumple" cuando ya no (o cuando nunca) es mentirle
 *      sobre su negocio, y quema el dominio de envío para todos los demás.
 *   2. ¿Es española? La regla del jefe: solo España, verificada por señales
 *      de la propia web (NIF/CIF, +34, dirección española); el .es cuenta como
 *      señal, el idioma no.
 *
 * Además se excluyen los buzones legales (avisolegal@, rgpd@, dpo@…), los
 * dominios de agencias (a ellos ya se les escribió con su propio mensaje y
 * prometí mensaje único) y los que no son de España (.mx, .uy…).
 *
 * El envío es OTRA función, con otra bandera, para que haya una revisión
 * humana entre "encontrado" y "enviado".
 */

import { readFile, writeFile } from "node:fs/promises";

const API = "https://sello-ia.com/api/scan";
const CLAVE = process.env.SCAN_API_KEY ?? "sk-interno-selloia-prospeccion-2026";
const ESTADO = ".datos/segundo-toque-estado.json";
const SALIDA = "docs/outreach/segundo-toque-candidatos.csv";

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const NO_ESCRIBIR =
  /^(rgpd|lopd|dpo|legal|privacidad|protecciondatos|avisolegal|abuse|postmaster|hostmaster|spam|unsubscribe|baja|administracion|direccion)/i;

const RUIDO_DOMINIO =
  /(google|facebook|instagram|twitter|linkedin|youtube|gmail|hotmail|outlook|live\.|yahoo)/i;

async function htmlDe(url, ms = 9000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; SelloIA/1.0)" } });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  } finally {
    clearTimeout(to);
  }
}

/** Señales fuertes de España en la propia web del prospecto. */
async function esEspanola(dominio) {
  const tld = dominio.split(".").pop();
  if (tld === "es") return { ok: true, senal: ".es" };
  let h = "";
  for (const p of ["/", "/aviso-legal", "/contacto"]) {
    h += await htmlDe(`https://${dominio}${p}`);
    if (/NIF|CIF|\b\d{8}[A-HJ-NP-TV-Z]\b|\+\d?34[\s.-]?\d{9}/i.test(h)) break;
    await dormir(80);
  }
  if (!h) return { ok: false, senal: "no responde" };
  if (/\b[A-HJ-NP-SUVW]\d{7}[0-9A-J]\b/.test(h)) return { ok: true, senal: "NIF/CIF" };
  if (/\+34[\s.-]?\d{9}/.test(h)) return { ok: true, senal: "tel. +34" };
  if (/\b(Madrid|Barcelona|Valencia|Sevilla|Zaragoza|Málaga|Bilbao|Alicante)\b/i.test(h))
    return { ok: true, senal: "dirección ES" };
  return { ok: false, senal: "sin señal de España" };
}

async function escanear(dominio) {
  for (let intento = 0; intento < 3; intento++) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-selloia-key": CLAVE },
      body: JSON.stringify({ url: `https://${dominio}` }),
    });
    if (r.status === 429) {
      const espera = 15 * 60 * 1000;
      console.log(`    429 rate limit · espero ${espera / 60000} min y reanudo (intento ${intento + 1})`);
      await dormir(espera);
      continue;
    }
    if (!r.ok) return null;
    return (await r.json()).resultado ?? null;
  }
  return null;
}

(async () => {
  // ── Quién escribió qué, y a quién NO se le vuelve a escribir ───────────────
  const enviados = JSON.parse(await readFile(".datos/emisor-estado.json", "utf8")).enviados ?? [];
  const agencias = new Set(
    (await readFile("docs/outreach/agencias-limpias.csv", "utf8"))
      .split(/\r?\n/)
      .slice(1)
      .map((l) => (l.split(";")[1] ?? "").trim().toLowerCase())
      .filter(Boolean)
  );

  const pendientes = [];
  for (const email of enviados) {
    const e = String(email).toLowerCase();
    const buzon = e.split("@")[0] ?? "";
    const dom = e.split("@")[1] ?? "";
    if (!dom || RUIDO_DOMINIO.test(dom)) continue;
    if (NO_ESCRIBIR.test(buzon)) continue;
    if (agencias.has(dom)) continue; // a ellos: mensaje único, prometido
    if (!pendientes.some((x) => x.email === e)) pendientes.push({ email: e, dominio: dom });
  }

  // ── Estado reanudable (el rate limit corta lotes largos) ──────────────────
  let estado = { hechos: {}, ultimo: -1 };
  try {
    estado = JSON.parse(await readFile(ESTADO, "utf8"));
  } catch {
    /* primer arranque */
  }

  console.log(`\n  Segundo toque · ${pendientes.length} destinatarios de la primera campaña\n`);

  const filas = [];
  let desde = Math.max(0, (estado.ultimo ?? -1) + 1);
  // Rehacer las filas de ejecuciones anteriores sin reescanear.
  for (const [, v] of Object.entries(estado.hechos ?? {})) if (v.fila) filas.push(v.fila);

  for (let i = desde; i < pendientes.length; i++) {
    const { email, dominio } = pendientes[i];
    const previo = estado.hechos?.[dominio];
    let r = previo?.resultado;
    if (!r) {
      r = await escanear(dominio);
      await dormir(2500);
      if (!r) {
        console.log(`  ${String(i + 1).padStart(2)}/${pendientes.length} · ${dominio} · escaneo no disponible`);
        continue;
      }
      estado.hechos[dominio] = { resultado: r, email };
      estado.ultimo = i;
      await writeFile(ESTADO, JSON.stringify(estado), "utf8");
    }

    // Criterio: sigue incumpliendo si hay un hallazgo de aviso ausente.
    const sinAviso = (r.hallazgos ?? []).find(
      (h) => h.articulo === "art50.1" && h.severity !== "ok" && /sin aviso/i.test(h.titulo)
    );
    if (!sinAviso) {
      console.log(`  ${String(i + 1).padStart(2)}/${pendientes.length} · ${dominio} · score ${r.score} · YA NO (o nunca) incumple`);
      continue;
    }

    const geo = await esEspanola(dominio);
    if (!geo.ok) {
      console.log(`  ${String(i + 1).padStart(2)}/${pendientes.length} · ${dominio} · incumple · DESCARTADO: ${geo.senal}`);
      continue;
    }

    const det = (r.detecciones ?? []).map((d) => d.proveedor).join(", ");
    const fila = `${dominio.split(".")[0]};${dominio};;${email};${det};score ${r.score} · ${geo.senal}`;
    if (!filas.some((f) => f.split(";")[1] === dominio)) filas.push(fila);
    estado.hechos[dominio].fila = fila;
    await writeFile(ESTADO, JSON.stringify(estado), "utf8");
    console.log(`  ✓ ${String(i + 1).padStart(2)}/${pendientes.length} · ${dominio.padEnd(34)} ${email.padEnd(34)} score ${r.score} · ${det}`);
  }

  await writeFile(SALIDA, ["empresa;dominio;nombre;email;evidencia;ruta", ...filas].join("\n") + "\n", "utf8");
  console.log(`\n  RESULTADO: ${filas.length} siguen incumpliendo y son de España`);
  console.log(`  escrito en ${SALIDA}\n`);
})();
