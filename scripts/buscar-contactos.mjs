#!/usr/bin/env node
/**
 * Extrae emails de contacto reales de los sitios web de los prospectos.
 *
 * Objetivo: no enviar a direcciones inventadas (info@, hola@) que rebotan.
 * Solo de los dominios que ya escaneamos ywhose evidencia tenemos.
 */

const UA = "Mozilla/5.0 (compatible; SelloIA/1.0; +https://sello-ia.com/bot)";

const OBJETIVOS = [
  { dominio: "flat101.com",           rutas: ["/contact", "/contacto", "/contacto/", "/"] },
  { dominio: "algenio.com",           rutas: ["/contacto", "/contact", "/"] },
  { dominio: "beedigital.es",         rutas: ["/contacto", "/contact", "/"] },
  { dominio: "metricool.com",         rutas: ["/contact", "/contacto", "/"] },
  { dominio: "producthackers.com",    rutas: ["/contact", "/contacto", "/"] },
  { dominio: "aulaweb.es",            rutas: ["/contacto", "/contact", "/"] },
  { dominio: "escuelaeuropeadeempresa.eu", rutas: ["/contacto", "/contact", "/"] },
  { dominio: "rodanet.com",           rutas: ["/contacto", "/contact", "/"] },
  { dominio: "aidigitalsite.com",     rutas: ["/contacto", "/contact", "/"] },
  { dominio: "latevaweb.com",         rutas: ["/contacto", "/contact", "/"] },
  { dominio: "socialmediapymes.com",  rutas: ["/contacto", "/contact", "/"] },
  { dominio: "buzzalyze.com",         rutas: ["/contacto", "/contact", "/"] },
  { dominio: "conectaweb.es",         rutas: ["/contacto", "/contact", "/"] },
  { dominio: "einforma.com",          rutas: ["/contacto", "/contact", "/"] },
  { dominio: "nachomg.com",           rutas: ["/contacto", "/contact", "/"] },
  { dominio: "bastidafarina.com",     rutas: ["/contacto", "/contact", "/"] },
];

const BASURA = new Set([
  "example.com","email.com","test.com","sentry.io","wixpress.com",
  "godaddy.com","squarespace.com","cloudflare.com","yourdomain.com",
  "domain.com","web.com","mail.com","gmail.com","yahoo.com","hotmail.com",
]);

// Emails de soporte/legales que no sirven para vender.
const DESCARTAR = /(sentry|wixpress|godaddy|squarespace|cloudflare|@2x|@2x_|legal|privacy|privacidad|abuse|postmaster|hostmaster|spam|noreply|no-reply|example)/i;

function normalizar(candidato) {
  if (!candidato.includes("@")) return null;
  const email = candidato.toLowerCase().trim().replace(/[.,;:)]+$/, "");
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) return null;
  const [user, dom] = email.split("@");
  if (!user || !dom) return null;
  if (DESCARTAR.test(email)) return null;
  // Preferencia: cuentas de personas sobre buzones genéricos sin datos.
  return { email, esGenerico: /^(info|contacto|contact|hola|hello|admin|general|ventas|sales|marketing|atencionalcliente|ayuda|support)$/.test(user) };
}

function extraer(html) {
  const hallados = new Map();
  const patrones = [
    /mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi,
    /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi,
  ];
  for (const p of patrones) {
    for (const m of html.matchAll(p)) {
      const e = normalizar(m[1]);
      if (e && !hallados.has(e.email)) hallados.set(e.email, e);
    }
  }
  return [...hallados.values()];
}

(async () => {
  const resultados = [];
  for (const obj of OBJETIVOS) {
    const encontrados = new Map();
    for (const ruta of obj.rutas) {
      if (encontrados.size >= 3) break;
      const url = `https://${obj.dominio}${ruta}`;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 9000);
        const res = await fetch(url, {
          redirect: "follow",
          signal: ctrl.signal,
          headers: { "User-Agent": UA, Accept: "text/html" },
        });
        clearTimeout(t);
        if (!res.ok) continue;
        const html = (await res.text()).slice(0, 900_000);
        for (const e of extraer(html)) {
          // Solo Emails del propio dominio o de proveedores de correo conocidos.
          const dom = e.email.split("@")[1];
          const mismoDominio = dom === obj.dominio || dom.endsWith(`.${obj.dominio}`);
          const gmailLike = /(gmail|outlook|hotmail|icloud|yahoo)\./i.test(dom);
          if (mismoDominio || gmailLike) {
            if (!encontrados.has(e.email)) encontrados.set(e.email, e);
          }
        }
      } catch { /* la ruta no existe o falla */ }
    }
    const lista = [...encontrados.values()];
    resultados.push({ dominio: obj.dominio, emails: lista });
    const marca = lista.length === 0 ? "(ninguno encontrado)" : lista.map((e) => e.email + (e.esGenerico ? " [genérico]" : " [personal]")).join(", ");
    console.log(`  ${obj.dominio.padEnd(30)} ${marca}`);
  }

  console.log("\n--- CSV sugerido ---\n");
  console.log("empresa;dominio;nombre;email;evidencia;ruta");
  for (const r of resultados) {
    if (!r.emails.length) continue;
    const mejor = r.emails.find((e) => !e.esGenerico) ?? r.emails[0];
    console.log(`${r.dominio};${r.dominio};;${mejor.email};;`);
  }
})();