import type { Locale } from "@/lib/i18n"

type PocketCopy = Record<"headline" | "home" | "games" | "tools" | "featured" | "board" | "puzzle" | "arcade" | "all" | "handy" | "text" | "textDescription" | "navigation", string>
export const POCKET_COPY: Record<Locale, PocketCopy> = {
  zh: { headline: "随手开一局", home: "首页", games: "游戏库", tools: "工具", featured: "精选", board: "棋类", puzzle: "益智", arcade: "街机", all: "全部游戏", handy: "趁手工具", text: "文本整理", textDescription: "清理空白与重复内容", navigation: "主导航" },
  en: { headline: "Pick up & play", home: "Home", games: "Games", tools: "Tools", featured: "Featured", board: "Board", puzzle: "Puzzle", arcade: "Arcade", all: "All games", handy: "Handy tools", text: "Text tidy", textDescription: "Clean spaces and duplicates", navigation: "Main navigation" },
  th: { headline: "หยิบมาเล่นสักตา", home: "หน้าหลัก", games: "คลังเกม", tools: "เครื่องมือ", featured: "แนะนำ", board: "หมาก", puzzle: "ฝึกสมอง", arcade: "อาร์เคด", all: "เกมทั้งหมด", handy: "เครื่องมือคู่ใจ", text: "จัดข้อความ", textDescription: "ลบช่องว่างและบรรทัดซ้ำ", navigation: "เมนูหลัก" },
}
