import type { Locale } from "../../../lib/i18n"

export const ARCADE_COPY = {
  zh: {
    headline: "好玩，不止一种。", subtitle: "经典与新意一起，随时开一局。",
    featured: "精选", board: "棋类", puzzle: "益智", arcade: "街机",
    home: "首页", games: "游戏库", tools: "工具", settings: "设置中心", navigation: "主导航",
    play: "开一局", bingo: "支持自动抽取和语音播报", tiles: "滑动合并数字，挑战高分", snake: "经典玩法，简单上手",
    more: "换个玩法", all: "查看全部", tetris: "经典下落，永不过时", gomoku: "连成五子，智胜对手",
    text: "文本整理", textDescription: "快速清理、统计和整理文本", input: "输入", result: "结果", output: "整理结果",
    privacy: "仅在本机处理 · 不上传、不保存输入内容。", libraryDescription: "熟悉的经典，新的挑战。", toolsDescription: "趁手的小工具，随用随开。",
  },
  en: {
    headline: "More ways to play.", subtitle: "Old favorites. New challenges. Your next round.",
    featured: "Featured", board: "Board", puzzle: "Puzzle", arcade: "Arcade",
    home: "Home", games: "Library", tools: "Tools", settings: "Settings", navigation: "Main navigation",
    play: "Let's play", bingo: "Automatic draws and voice announcements", tiles: "Slide, merge, beat your best", snake: "A classic. Easy to pick up.",
    more: "Try something else", all: "View all", tetris: "The timeless falling blocks", gomoku: "Five in a row wins",
    text: "Text tidy", textDescription: "Clean, count and organize text", input: "Input", result: "Result", output: "Cleaned text",
    privacy: "On this device only · No uploads or saved input.", libraryDescription: "Familiar favorites. Fresh challenges.", toolsDescription: "Handy tools, ready when you are.",
  },
  th: {
    headline: "สนุกได้หลายแบบ", subtitle: "เกมคลาสสิกและความท้าทายใหม่ พร้อมให้เล่น",
    featured: "แนะนำ", board: "กระดาน", puzzle: "ปริศนา", arcade: "อาร์เคด",
    home: "หน้าแรก", games: "คลังเกม", tools: "เครื่องมือ", settings: "ตั้งค่า", navigation: "เมนูหลัก",
    play: "เริ่มเล่น", bingo: "สุ่มอัตโนมัติพร้อมเสียงประกาศ", tiles: "รวมตัวเลข ทำแต้มสูง", snake: "เกมคลาสสิก เล่นง่าย",
    more: "ลองเกมอื่น", all: "ดูทั้งหมด", tetris: "บล็อกตกสุดคลาสสิก", gomoku: "เรียงห้าตัวเพื่อชนะ",
    text: "จัดข้อความ", textDescription: "ล้าง นับ และจัดระเบียบข้อความ", input: "ข้อความ", result: "ผลลัพธ์", output: "ข้อความที่จัดแล้ว",
    privacy: "ประมวลผลในเครื่อง · ไม่อัปโหลดหรือบันทึกข้อความ", libraryDescription: "เกมโปรดที่คุ้นเคย ความท้าทายใหม่", toolsDescription: "เครื่องมือพร้อมใช้ทุกเมื่อ",
  },
} satisfies Record<Locale, Record<string, string>>
