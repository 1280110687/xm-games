export type Locale = "zh" | "en" | "th"

export const locales: Locale[] = ["zh", "en", "th"]

export const localeNames: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  th: "ไทย",
}

export const translations = {
  zh: {
    // Common
    appName: "XM-Games",
    selectGame: "选择一个游戏开始玩吧",
    
    // Bingo Draw
    bingo: "BINGO",
    bingoGame: "抽数字游戏",
    bingoDescription: "支持自动抽取和语音播报的 Bingo 抽数字游戏",
    bingoSubtitle: "抽数字游戏 - 语音播报",
    currentNumber: "当前数字",
    clickToDraw: "点击抽取",
    drawNumber: "抽取数字",
    start: "开始",
    pause: "暂停",
    reset: "重置",
    drawn: "已抽",
    remaining: "剩余",
    settings: "设置",
    voiceBroadcast: "语音播报",
    autoDrawMode: "自动抽取模式",
    drawInterval: "抽取间隔",
    seconds: "秒",
    recentDraws: "最近抽取",
    numberBoard: "数字板",
    allDrawn: "已全部抽完",

    // Bingo Cards
    bingoCards: "卡片",
    bingoCardsGame: "Bingo 卡片",
    bingoCardsDescription: "生成随机 Bingo 卡片，支持语音识别输入数字",
    card: "卡片",
    addCard: "添加卡片",
    addFirstCard: "添加第一张卡片",
    noCards: "还没有卡片，点击下方按钮添加",
    enterNumber: "输入数字 (1-75)",
    confirm: "确认",
    startListening: "开始语音识别",
    stopListening: "停止语音识别",
    resetMarks: "清除标记",
    markedCount: "已标记",
    markedNumbers: "已标记数字",
  },
  en: {
    // Common
    appName: "XM-Games",
    selectGame: "Choose a game to start playing",
    
    // Bingo Draw
    bingo: "BINGO",
    bingoGame: "Number Draw Game",
    bingoDescription: "Bingo number draw game with auto-draw and voice broadcast",
    bingoSubtitle: "Number Draw Game - Voice Broadcast",
    currentNumber: "Current Number",
    clickToDraw: "Click to Draw",
    drawNumber: "Draw Number",
    start: "Start",
    pause: "Pause",
    reset: "Reset",
    drawn: "Drawn",
    remaining: "Remaining",
    settings: "Settings",
    voiceBroadcast: "Voice Broadcast",
    autoDrawMode: "Auto Draw Mode",
    drawInterval: "Draw Interval",
    seconds: "sec",
    recentDraws: "Recent Draws",
    numberBoard: "Number Board",
    allDrawn: "All numbers drawn",

    // Bingo Cards
    bingoCards: "Cards",
    bingoCardsGame: "Bingo Cards",
    bingoCardsDescription: "Generate random Bingo cards with voice recognition input",
    card: "Card",
    addCard: "Add Card",
    addFirstCard: "Add First Card",
    noCards: "No cards yet. Click the button below to add one.",
    enterNumber: "Enter number (1-75)",
    confirm: "Confirm",
    startListening: "Start Voice Input",
    stopListening: "Stop Voice Input",
    resetMarks: "Clear Marks",
    markedCount: "Marked",
    markedNumbers: "Marked Numbers",
  },
  th: {
    // Common
    appName: "XM-Games",
    selectGame: "เลือกเกมเพื่อเริ่มเล่น",
    
    // Bingo Draw
    bingo: "บิงโก",
    bingoGame: "เกมจับฉลากตัวเลข",
    bingoDescription: "เกมบิงโกจับฉลากตัวเลขพร้อมระบบอัตโนมัติและเสียงพากย์",
    bingoSubtitle: "เกมจับฉลากตัวเลข - เสียงพากย์",
    currentNumber: "ตัวเลขปัจจุบัน",
    clickToDraw: "คลิกเพื่อจับฉลาก",
    drawNumber: "จับฉลาก",
    start: "เริ่ม",
    pause: "หยุด",
    reset: "รีเซ็ต",
    drawn: "จับแล้ว",
    remaining: "เหลือ",
    settings: "ตั้งค่า",
    voiceBroadcast: "เสียงพากย์",
    autoDrawMode: "โหมดจับฉลากอัตโนมัติ",
    drawInterval: "ระยะเวลาจับฉลาก",
    seconds: "วินาที",
    recentDraws: "จับฉลากล่าสุด",
    numberBoard: "กระดานตัวเลข",
    allDrawn: "จับฉลากหมดแล้ว",

    // Bingo Cards
    bingoCards: "บัตร",
    bingoCardsGame: "บัตรบิงโก",
    bingoCardsDescription: "สร้างบัตรบิงโกแบบสุ่มพร้อมระบบรับเสียง",
    card: "บัตร",
    addCard: "เพิ่มบัตร",
    addFirstCard: "เพิ่มบัตรแรก",
    noCards: "ยังไม่มีบัตร คลิกปุ่มด้านล่างเพื่อเพิ่ม",
    enterNumber: "ใส่ตัวเลข (1-75)",
    confirm: "ยืนยัน",
    startListening: "เริ่มรับเสียง",
    stopListening: "หยุดรับเสียง",
    resetMarks: "ล้างเครื่องหมาย",
    markedCount: "ทำเครื่องหมายแล้ว",
    markedNumbers: "ตัวเลขที่ทำเครื่องหมาย",
  },
} as const

export type TranslationKey = keyof typeof translations.zh

export function getTranslation(locale: Locale, key: TranslationKey): string {
  return translations[locale][key]
}
