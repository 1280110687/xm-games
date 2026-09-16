import type { Locale } from "@/lib/i18n"

type RetroCopy = {
  home: string; games: string; tools: string; all: string; handy: string;
  start: string; previous: string; next: string; select: string; search: string;
  empty: string; clear: string; library: string; tagline: string; text: string;
  tiles: string; gomoku: string; snake: string;
}
export const RETRO_COPY: Record<Locale, RetroCopy> = {
  zh: { home: "首页", games: "游戏", tools: "工具", all: "全部游戏", handy: "趁手工具",
    start: "开始游戏", previous: "上一款游戏", next: "下一款游戏", select: "选择游戏卡带", search: "搜索游戏",
    empty: "没有找到这款游戏", clear: "清除搜索", library: "游戏卡带库", tagline: "随时玩一局", text: "文本整理",
    tiles: "合并数字，\n挑战下一步", gomoku: "纵横之间，\n连成五子", snake: "转个方向，\n再吃一口" },
  en: { home: "Home", games: "Games", tools: "Tools", all: "All games", handy: "Handy tools",
    start: "Start game", previous: "Previous game", next: "Next game", select: "Choose a cartridge", search: "Search games",
    empty: "No games found", clear: "Clear search", library: "Cartridge library", tagline: "Pick up & play", text: "Text tidy",
    tiles: "Merge the tiles.\nMake your next move.", gomoku: "Think ahead.\nConnect five.", snake: "One more turn.\nOne more bite." },
  th: { home: "หน้าแรก", games: "เกม", tools: "เครื่องมือ", all: "เกมทั้งหมด", handy: "เครื่องมือใกล้มือ",
    start: "เริ่มเกม", previous: "เกมก่อนหน้า", next: "เกมถัดไป", select: "เลือกตลับเกม", search: "ค้นหาเกม",
    empty: "ไม่พบเกม", clear: "ล้างการค้นหา", library: "คลังตลับเกม", tagline: "หยิบขึ้นมาเล่น", text: "จัดข้อความ",
    tiles: "รวมตัวเลข\nวางแผนตาถัดไป", gomoku: "คิดล่วงหน้า\nเรียงให้ครบห้า", snake: "เลี้ยวอีกนิด\nกินอีกคำ" },
}
