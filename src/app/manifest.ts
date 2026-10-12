import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PickPal",
    short_name: "PickPal",
    description:
      "Recuerda fechas importantes y recibe ideas de regalo personalizadas con IA.",
    start_url: "/",
    display: "standalone",
    // «Compartir» del móvil → PickPal, con la app instalada (Android; iPhone no
    // lo admite). POST para que el enlace no viaje en la query: ver
    // src/app/compartir/route.ts.
    share_target: {
      action: "/compartir",
      method: "POST",
      enctype: "application/x-www-form-urlencoded",
      params: { title: "title", text: "text", url: "url" },
    },
    background_color: "#FBF7EE",
    theme_color: "#FBF7EE",
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
        purpose: "any",
      },
      {
        // Logo at 56% over the background so it survives Android's mask
        // (safe zone = centred circle of 80%).
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
