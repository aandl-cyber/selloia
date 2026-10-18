import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Los resultados de escaneo son de terceros y no deben indexarse.
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://sello-ia.com/sitemap.xml",
    host: "https://sello-ia.com",
  };
}