import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Controle Pro - Controle Financeiro",
    short_name: "Controle Pro",
    description: "Controle financeiro inteligente: receitas, despesas, contas, categorias e relatórios em tempo real.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#1e3a8a",
    lang: "pt-BR",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
