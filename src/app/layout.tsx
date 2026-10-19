import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const SITIO = "https://sello-ia.com";

// Se evalúa en tiempo de módulo (build), no de render: con `cacheComponents`
// activo, un `new Date()` dentro del árbol bloquea el prerenderizado.
const ANIO = new Date().getFullYear();

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  title: {
    default: "SelloIA · ¿Tu web cumple el Artículo 50 del Reglamento Europeo de IA?",
    template: "%s · SelloIA",
  },
  description:
    "Escanea tu web en 60 segundos y descubre si incumples el Artículo 50 del Reglamento (UE) 2024/1689. Avisos legales en español listos para pegar. Exigible desde el 2 de agosto de 2026.",
  keywords: [
    "Ley de IA",
    "Reglamento Europeo de IA",
    "AI Act",
    "Artículo 50",
    "cumplimiento normativo",
    "RGPD",
    "pymes",
    "transparencia IA",
    "chatbot legal",
  ],
  authors: [{ name: "SelloIA" }],
  creator: "SelloIA",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITIO,
    siteName: "SelloIA",
    title: "¿Tu web cumple el Artículo 50 del Reglamento Europeo de IA?",
    description:
      "Escaneo gratuito de tu dominio. Avisos legales en español listos para copiar y pegar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SelloIA · Cumplimiento del Artículo 50 del AI Act",
    description: "Tu web usa IA y no lo dice. Eso ya es sancionable. Escanea tu dominio gratis.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "technology",
  other: {
    "geo.region": "ES",
    "geo.placename": "España",
  },
};

/**
 * Datos estructurados de organización: lo leen los buscadores y también los
 * asistentes de IA para saber quién está detrás del sitio. Sin esto, SelloIA es
 * una web más; con esto, es una empresa identificable y citable.
 */
const ORGANIZATION = {
  "@type": "Organization",
  name: "A & L Marketing Ltd",
  alternateName: "SelloIA",
  url: "https://sello-ia.com",
  logo: "https://sello-ia.com/icon",
  email: "hola@sello-ia.com",
  telephone: "+44-7462-154275",
  vatID: "",
  address: {
    "@type": "PostalAddress",
    streetAddress: "2 Frederick Street, Kings Cross",
    addressLocality: "London",
    postalCode: "WC1X 0ND",
    addressCountry: "GB",
  },
  areaServed: { "@type": "Country", name: "España" },
  knowsLanguage: "es-ES",
  description:
    "Proveedor de herramientas de verificación técnica del cumplimiento del Reglamento Europeo de Inteligencia Artificial (UE) 2024/1689.",
};

export const viewport: Viewport = {
  themeColor: "#1c1917",
  width: "device-width",
  initialScale: 1,
};

const NAV = [
  { href: "/precios", texto: "Precios" },
  { href: "/comprobar", texto: "¿Estoy cubierto?" },
  { href: "/blog", texto: "Blog" },
  { href: "/transparencia-ia", texto: "Transparencia" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }}
        />
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-piedra-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar al contenido
        </a>

        <header className="sticky top-0 z-40 border-b border-piedra-200 bg-piedra-50/85 backdrop-blur-md">
          <div className="contenedor flex h-16 items-center justify-between">
            {/*
              Sin aria-label: el texto visible "SelloIA" ya es un nombre
              accesible correcto y evita el fallo WCAG 2.5.3, que exige que el
              nombre accesible contenga exactamente el texto que se ve.
            */}
            <Link href="/" className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 place-items-center rounded-md bg-piedra-900 font-display text-sm font-bold text-white"
              >
                S
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-piedra-900">
                SelloIA
              </span>
            </Link>

            <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-piedra-600 transition-colors hover:bg-piedra-100 hover:text-piedra-900"
                >
                  {n.texto}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Link href="/#escanner" className="boton boton-primario hidden sm:inline-flex">
                Escanear mi web
              </Link>
            </div>
          </div>
        </header>

        <main id="contenido">{children}</main>

        <footer className="mt-24 border-t border-piedra-200 bg-white">
          <div className="contenedor py-14">
            <div className="grid gap-10 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="grid h-8 w-8 place-items-center rounded-md bg-piedra-900 font-display text-sm font-bold text-white"
                  >
                    S
                  </span>
                  <span className="font-display text-lg font-semibold text-piedra-900">
                    SelloIA
                  </span>
                </div>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-piedra-500">
                  Herramienta técnica para comprobar y documentar el cumplimiento del
                  Reglamento Europeo de Inteligencia Artificial en tu web.
                </p>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-piedra-900">Producto</h2>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li><Link href="/#escanner" className="text-piedra-500 hover:text-piedra-900">Escaneo gratuito</Link></li>
                  <li><Link href="/precios" className="text-piedra-500 hover:text-piedra-900">Precios</Link></li>
                  <li><Link href="/sello" className="text-piedra-500 hover:text-piedra-900">El SelloIA</Link></li>
                  <li><Link href="/estado" className="text-piedra-500 hover:text-piedra-900">Estado de servicio</Link></li>
                </ul>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-piedra-900">Legal</h2>
                <ul className="mt-4 space-y-2.5 text-sm">
                  <li><Link href="/transparencia-ia" className="text-piedra-500 hover:text-piedra-900">Transparencia en IA</Link></li>
                  <li><Link href="/aviso-legal" className="text-piedra-500 hover:text-piedra-900">Aviso legal</Link></li>
                  <li><Link href="/privacidad" className="text-piedra-500 hover:text-piedra-900">Privacidad</Link></li>
                  <li><Link href="/cookies" className="text-piedra-500 hover:text-piedra-900">Cookies</Link></li>
                </ul>
              </div>
            </div>

            <div className="mt-12 rounded-lg border border-riesgo-medio/20 bg-riesgo-medio-fondo p-4">
              <p className="text-xs leading-relaxed text-piedra-700">
                <strong>Aviso importante.</strong> SelloIA ofrece herramientas técnicas de
                verificación y plantillas informativas. Este material{" "}
                <strong>no constituye asesoramiento jurídico</strong>. Las obligaciones
                concretas dependen de tu situación y de la interpretación de la autoridad
                competente. Consulta con un profesional del derecho antes de dar por bueno
                tu cumplimiento.
              </p>
            </div>

            <p className="mt-8 text-xs text-piedra-400">
              © {ANIO} A &amp; L Marketing Ltd · 2 Frederick Street, Kings Cross, London
              WC1X 0ND · <a href="tel:+447462154275" className="underline underline-offset-2">+44 7462 154275</a>
            </p>
            <p className="mt-2 text-xs text-piedra-400">
              SelloIA verifica el cumplimiento del Art. 50 del Reglamento (UE) 2024/1689,
              exigible desde el 2 de agosto de 2026.
            </p>

            {/* Presencia en Que IA Es?, directorio español de herramientas de IA.
                El alta gratuita exige este enlace de vuelta, que además aporta un
                backlink dofollow. El alt describe lo que es, sin inventar premios. */}
            <a
              href="https://queia.es"
              target="_blank"
              rel="noopener"
              className="mt-6 inline-block rounded-md opacity-80 transition-opacity hover:opacity-100"
              title="Directorio de herramientas de IA en español"
            >
              <img
                src="https://queia.es/badge/queia-oscura.svg"
                alt="Que IA Es?, directorio de herramientas de IA en español"
                width="180"
                height="45"
                loading="lazy"
              />
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}