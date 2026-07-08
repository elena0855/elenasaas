import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?v=1",
    name: "Elena SaaS",
    short_name: "Elena",
    description: "Elena SaaS - Caisse Enregistreuse & Assistant Vocal",
    start_url: "/login",
    display: "standalone",
    background_color: "#0a0f1e",
    theme_color: "#00f0ff",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
