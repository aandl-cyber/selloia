#!/usr/bin/env node
/**
 * Prospección nocturna.
 *
 * No envía correos. Descubre dominios de agencias digitales españolas, comprueba
 * con el motor de escaneo cuáles tienen IA sin el aviso del Art. 50 y extrae
 * emails VERIFICADOS de sus propias webs. Deja un CSV listo para enviar.
 *
 * Descartar a propósito las buzones legales/fiscales: un cold email a un
 * buzón de protección de datos empieza muy mal la relación y quema el dominio.
 *
 * Uso: node scripts/prospeccion-nocturna.mjs <salida.csv>
 */

import { writeFile } from "node:fs/promises";

const API = process.env.SCAN_API ?? "https://sello-ia.com/api/scan";
const SECRETO = process.env.CRON_SECRET ?? "";
const SALIDA = process.argv[2] ?? "docs/outreach/prospectos-noche.csv";

const SEMILLAS = `
algenio.com sayonara.es efor.es theatlas.es bierzoseo.com peanutbutter.es
begoromero.com marketinginsiderreview.com pangostudio.com pinchaaqui.es
neoattack.com idital.es escuelaecommerce.com wearecrisp.com innovadeluxe.com
allinagency.com comunicare.es shopigurus.com latevaweb.com
socialmediapymes.com beedigital.es metricool.com producthackers.com
escuelaeuropeadeempresa.eu rodanet.com aidigitalsite.com buzzalyze.com
conectaweb.es einforma.com nachomg.com bastidafarina.com flat101.com
marketing4ecommerce.com codigobase.com aulaweb.es einforma.es
nexoestudio.com conectaweb.com bizumcreo.com
clasificacion.es rankingranking.com brainyagency.com agencia-seo.es
marketingconideas.com neuroagency.es agenciawebmadrid.es
diseñoweb.es disenolibre.es estudiob.com creamosweb.es
webdesign.es wordpress-es.es gestiondecontenidos.es
agenciadigital.es agenciaonline.es marketingyventas.es
seoycontenido.es posicionamientoweb.es consultoriadigital.es
empresasweb.es desain.es estudio-creativo.es
`.trim().split(/\s+/).filter(Boolean);

const UA = "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)";
const MALOS = /(sentry|wixpress|godaddy|squarespace|cloudflare|example|2x_|rgpd|lopd|dpo|privacy|privacidad|abuse|postmaster|noreply|no-reply|legal@|spam)/i;
const GENERICOS = /^(info|contacto|contact|hola|hello|admin|general|ventas|sales|marketing|prensa|ayuda|support|atencionalcliente|clientes|comercial|direccion|recepcion)/i;
const RUTAS = ["/", "/contacto", "/contact", "/contact-us", "/privacidad", "/aviso-legal", "/quienes-somos"];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function emailsDe(dominio) {
  const hallados = new Map();
  for (const ruta of RUTAS) {
    if (hallados.size >= 2) break;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`https://${dominio}${ruta}`, {
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "User-Agent": UA, Accept: "text/html" },
      });
      if (!res.ok) continue;
      const html = (await res.text()).slice(0, 900_000);
      for (const m of html.matchAll(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)) {
        const e = m[1].toLowerCase();
        if (MALOS.test(e)) continue;
        const d = e.split("@")[1];
        if ((d === dominio || d.endsWith("." + dominio)) && !hallados.has(e)) {
          hallados.set(e, { email: e, generico: GENERICOS.test(e.split("@")[0]) });
        }
      }
    } catch { /* ruta fallida */ } finally { clearTimeout(to); }
  }
  return [...hallados.values()].sort((a, b) => (a.generico === b.generico ? 0 : a.generico ? 1 : -1));
}

(async () => {
  console.log(`\n  Prospección nocturna · ${SEMILLAS.length} dominios semilla`);
  console.log(`  Escaneo: ${API}\n`);

  const filas = [];
  let conIncumplimiento = 0;

  for (const dominio of SEMILLAS) {
    process.stdout.write(`  ${dominio.padEnd(32)} `);
    try {
      const res = await fetch(`${API}?secret=${encodeURIComponent(SECRETO)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: `https://${dominio}`, sitio: "" }),
      });
      const json = await res.json();

      if (json.error || !json.resultado) {
        console.log(`(no escaneable)`);
      } else {
        const r = json.resultado;
        if (r.estado === "fallido") {
          console.log(`(ilegible)`);
        } else {
          const sinAviso = r.detecciones.filter(
            (d) => ["chatbot", "avatar", "voz"].includes(d.tipo) && !d.conAviso
          );
          if (sinAviso.length === 0) {
            console.log(`score ${r.score} · sin incumplimiento`);
          } else {
            const clave = sinAviso.map((d) => d.proveedor).join(" + ");
            const emails = await emailsDe(dominio);
            const elegido = emails.find((e) => !e.generico) ?? emails[0];
            console.log(
              `score ${r.score} · SIN AVISO: ${clave} · ${
                elegido ? elegido.email : "SIN EMAIL PUBLICADO"
              }`
            );
            if (elegido) {
              filas.push({ dominio, email: elegido.email, evidencia: clave });
              conIncumplimiento++;
            }
          }
        }
      }
    } catch (e) {
      console.log(`error: ${String(e.message).slice(0, 40)}`);
    }
    await espera(400);
  }

  const csv = [
    "empresa;dominio;nombre;email;evidencia;ruta",
    ...filas.map((f) => `${f.dominio.split(".")[0]};${f.dominio};;${f.email};${f.evidencia};/`),
  ].join("\n");

  await writeFile(SALIDA, csv + "\n", "utf8");
  console.log(`\n  Listo: ${filas.length} prospectos con email verificado -> ${SALIDA}`);
  console.log(`  Revisables antes de enviar con --enviar. No se ha enviado nada.\n`);
})();