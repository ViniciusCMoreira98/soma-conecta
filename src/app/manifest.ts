import type { MetadataRoute } from "next";

// Manifesto do PWA (servido em /manifest.webmanifest): permite instalar o SOMA Conecta como aplicativo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SOMA Conecta",
    short_name: "SOMA",
    description: "Encontre e participe dos SOMAS da sua igreja: comunhão, estudo bíblico e oração perto de você.",
    lang: "pt-BR",
    start_url: "/encontrar",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf9f6",
    theme_color: "#27704b",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
