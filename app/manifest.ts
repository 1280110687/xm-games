import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
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
    shortcuts: [
      {
        name: "Bingo 抽号",
        short_name: "Bingo",
        description: "快速进入 Bingo 自动抽号。",
        url: "/bingo",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      {
        name: "Bingo 卡片",
        short_name: "Bingo 卡片",
        description: "打开 Bingo 卡片并标记抽取号码。",
        url: "/bingo-cards",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      {
        name: "中国象棋",
        short_name: "象棋",
        description: "打开本机双人或离线算法对战。",
        url: "/chinese-chess",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      {
        name: "文字二维码",
        short_name: "二维码",
        description: "把文字、文案或链接生成二维码。",
        url: "/qr-code",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
    ],
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
