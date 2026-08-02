import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "XM-Games",
    short_name: "XM-Games",
    description: "支持多语言、离线访问与局域网对战的浏览器小游戏合集。",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#101421",
    theme_color: "#101421",
    orientation: "any",
    lang: "zh-CN",
    categories: ["games", "entertainment", "utilities"],
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
