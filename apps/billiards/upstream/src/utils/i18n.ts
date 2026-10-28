/**
 * Minimal i18n for player-facing strings.
 *
 * English is the key: `t("Hit")` returns "Hit" when no translation exists, so a
 * missing entry degrades to readable English rather than a blank control. Only
 * non-English locales are stored, which keeps English from drifting out of sync
 * with the source strings it is keyed by.
 *
 * Locale selection order: `?locale=` query param (for testing and for sharing a
 * link in a given language), then the browser's preferred languages, then
 * English. Set `document.documentElement.lang` on load so assistive technology
 * announces the strings with the correct voice.
 *
 * Chinese ships as a single `zh` dictionary in Traditional characters: every
 * `zh-*` tag (zh-CN, zh-TW, zh-HK, zh-Hans, zh-Hant) matches on the language
 * subtag alone, so Simplified-browser visitors read Traditional too rather than
 * falling back to English. `zh-Hant` is advertised to the document so the
 * browser resolves Han-unified glyphs to Traditional forms instead of guessing
 * from the region.
 */

export const LOCALES = ["ko", "zh"] as const

export type Locale = (typeof LOCALES)[number]

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    // Button labels are short by design. "Hit" is the shooting action; "Place
    // Ball" keeps the newline so the button still breaks across two lines.
    Hit: "공치기",
    "Place\nBall": "공놓기",
    // Notification dialog buttons and title headings. Dialog bodies (the
    // subtext) still stay in the source language. Where a label reads
    // naturally with a different word order, `{name}` placeholders keep the
    // English source grammatical while the translation stays native.
    "Back to Lobby": "로비로 돌아가기",
    "Back to Arena": "아레나로 돌아가기",
    // Arena upload in flight: the button is inert until the result is sent.
    "Uploading result…": "결과 업로드 중…",
    "New Game": "새 게임",
    Replay: "다시보기",
    Rematch: "재대결",
    // Foul badge: the opponent may place the cue ball anywhere before the
    // next shot. "자유구" is the established Korean billiards term.
    "Ball in hand": "자유구",
    // Bot-mode info badge: the player breaks/shoots first (선공 vs 선후공).
    "You first": "선공",
    // Points-race length (three-cushion/sagu): first to reach {score} points
    // wins, written in the Korean "선취 N점" style.
    "Race to: {score}": "선취 {score}점",
    // Notification titles (dialog headings). "파울" is the term Korean
    // billiards players actually use for a foul; "경기" (match) reads better
    // than "게임" for these headings.
    FOUL: "파울",
    "YOU WON": "승리",
    "YOU LOST": "패배",
    "GAME OVER": "경기 종료",
    "Concede Game": "경기 기권",
    "Replay Complete": "다시보기 완료",
    "Waiting for opponent to join": "상대 입장 대기 중",
    // Concede confirmation.
    Concede: "기권",
    "Play on": "계속하기",
    // Three-cushion break prompt: stop and take the win, or carry the run on.
    "Declare win": "승리 선언",
    "Continue break": "이어서 치기",
    // Reveal (card game) game over.
    "Update Deck": "덱 바꾸기",
    // Banner controls.
    "Share replay link": "리플레이 링크 공유",
    share: "공유",
    upload: "업로드",
    "Break : {score}": "브레이크: {score}",
    "Open high break {score}": "하이브레이크 {score} 보기",
  },
  // Traditional Chinese, in the vocabulary Taiwanese billiards players use:
  // 母球 (cue ball), 自由球 (ball in hand), 出桿 (stroke), 單桿 (a break/run).
  zh: {
    Hit: "擊球",
    // 擺球 is how Taiwanese players say "place a ball", so the label reads as
    // one phrase and keeps no line break: split 放置 / 母球 reads like a caption
    // and 放置 alone is stiffer than the billiards-native verb.
    "Place\nBall": "擺母球",
    "Back to Lobby": "返回大廳",
    "Back to Arena": "返回球場",
    "Uploading result…": "正在上傳結果…",
    "New Game": "新對局",
    Replay: "重播",
    // 再戰 is the idiomatic challenge wording, and shorter than 再次對戰.
    Rematch: "再戰",
    "Ball in hand": "自由球",
    // Bot-mode info badge: the player breaks first.
    "You first": "你先攻",
    // Points-race length, in the "搶 N 分" (race to N) style.
    "Race to: {score}": "搶 {score} 分",
    FOUL: "犯規",
    "YOU WON": "勝利",
    "YOU LOST": "落敗",
    "GAME OVER": "比賽結束",
    // Conceding is 認輸 (admitting defeat); the confirmation button reuses it.
    "Concede Game": "認輸",
    "Replay Complete": "重播結束",
    "Waiting for opponent to join": "等待對手加入",
    Concede: "認輸",
    "Play on": "繼續比賽",
    // Three-cushion break prompt: stop and take the win, or carry the run on.
    "Declare win": "宣告勝利",
    "Continue break": "繼續出桿",
    // Reveal (card game) game over.
    "Update Deck": "更換牌組",
    "Share replay link": "分享重播連結",
    share: "分享",
    upload: "上傳",
    // High-break banner: 單桿 is the carom/snooker term for a single run.
    "Break : {score}": "單桿：{score}",
    "Open high break {score}": "查看最高單桿 {score}",
  },
}

// Document language, when the locale code alone is too coarse for the browser
// to pick the right script: `zh` is Traditional here, so advertise `zh-Hant`.
const HTML_LANG: Partial<Record<Locale, string>> = { zh: "zh-Hant" }

function fromTag(tag: string | undefined | null): Locale | undefined {
  if (!tag) return undefined
  const language = tag.toLowerCase().split("-")[0]
  return LOCALES.find((locale) => locale === language)
}

function fromBrowser(): Locale | undefined {
  const tags = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]
  for (const tag of tags) {
    const locale = fromTag(tag)
    if (locale) return locale
  }
  return undefined
}

let xmLocale = "en"
const xmTranslations: Record<string, Record<string, string>> = {
  zh: {
    "You":"你", "Computer":"电脑", "Solids":"全色球", "Stripes":"花色球", "Game over":"本局结束", "Game over. Start a new game.":"本局已结束，可以开始新一局。",
    "Cue ball potted":"白球落袋", "No ball hit":"未碰到目标球", "Wrong group hit first":"先碰到了对方球组", "No cushion after contact":"碰球后没有球进袋或碰库", "Hitting the 8-ball first is a foul":"尚未分组时不能先碰黑8", "Must hit 8-ball first":"当前必须先碰黑8", "8-ball pocketed early":"黑8提前落袋，复位后由对方自由摆球", "8-ball pocketed on foul":"黑8在犯规时落袋，本局判负",
    "Hit":"击球", "Place\nBall":"确认摆球", "Power":"力度", "Shot power":"击球力度", "Aim left":"向左微调", "Aim right":"向右微调", "Change camera":"切换视角", "Billiards table":"台球桌", "Paused":"已暂停",
    "Drag to place the cue ball, then confirm.":"拖动摆放白球，然后确认。",
    "Drag to aim. Set power, then shoot.":"左右拖动瞄准，调整力度后击球。", "Computer is playing…":"电脑正在击球…", "Balls are moving…":"球正在移动…",
    "New Game":"再来一局", "Replay":"回放", "Ball in hand":"自由球", "FOUL":"犯规", "YOU WON":"你赢了", "YOU LOST":"你输了", "GAME OVER":"本局结束", "Replay Complete":"回放结束", "Concede Game":"结束本局", "Concede":"结束", "Play on":"继续游戏", "You first":"你先开球"
  },
  th: {
    "You":"คุณ", "Computer":"คอมพิวเตอร์", "Solids":"ลูกสีเต็ม", "Stripes":"ลูกลาย", "Game over":"จบเกม", "Game over. Start a new game.":"เกมจบแล้ว เริ่มเกมใหม่ได้",
    "Cue ball potted":"ลูกขาวลงหลุม", "No ball hit":"ไม่โดนลูกเป้าหมาย", "Wrong group hit first":"โดนลูกของคู่ต่อสู้ก่อน", "No cushion after contact":"หลังชนลูก ไม่มีลูกลงหลุมหรือกระทบชิ่ง", "Hitting the 8-ball first is a foul":"ยังไม่ได้แบ่งกลุ่ม ห้ามโดนลูก 8 ก่อน", "Must hit 8-ball first":"ต้องโดนลูก 8 ก่อน", "8-ball pocketed early":"ลูก 8 ลงหลุมก่อนเวลา วางกลับและให้คู่ต่อสู้วางลูกขาว", "8-ball pocketed on foul":"ลูก 8 ลงหลุมขณะฟาวล์ แพ้เกมนี้",
    "Hit":"ตีลูก", "Place\nBall":"ยืนยันวางลูก", "Power":"แรง", "Shot power":"แรงตีลูก", "Aim left":"เล็งซ้าย", "Aim right":"เล็งขวา", "Change camera":"เปลี่ยนมุมมอง", "Billiards table":"โต๊ะบิลเลียด", "Paused":"หยุดชั่วคราว",
    "Drag to place the cue ball, then confirm.":"ลากเพื่อวางลูกขาว แล้วยืนยัน", "Drag to aim. Set power, then shoot.":"ลากซ้ายขวาเพื่อเล็ง ปรับแรงแล้วตี", "Computer is playing…":"คอมพิวเตอร์กำลังเล่น…", "Balls are moving…":"ลูกกำลังเคลื่อนที่…", "New Game":"เล่นใหม่", "Replay":"ดูย้อนหลัง", "Ball in hand":"วางลูกขาวได้", "FOUL":"ฟาวล์", "YOU WON":"คุณชนะ", "YOU LOST":"คุณแพ้", "GAME OVER":"จบเกม", "Replay Complete":"จบการเล่นย้อนหลัง", "Concede Game":"จบเกมนี้", "Concede":"จบเกม", "Play on":"เล่นต่อ", "You first":"คุณเริ่มก่อน"
  }
}
export function setLocale(locale: string) { xmLocale = ["zh", "en", "th"].includes(locale) ? locale : "en" }
let resolved: Locale | undefined

/** Current locale, or undefined when English is in use. */
export function currentLocale(): Locale | undefined {
  if (resolved === undefined) {
    const requested = new URLSearchParams(location.search).get("locale")
    // An explicit ?locale= is authoritative: one we do not ship resolves to
    // English rather than silently falling back to the browser language, which
    // would make the result depend on the visitor's OS.
    resolved = requested ? fromTag(requested) : fromBrowser()
  }
  return resolved
}

/**
 * Translate an English source string, falling back to the string itself.
 * Optional `params` fill `{name}` placeholders (e.g. a score).
 */
export function t(
  key: string,
  params?: Record<string, string | number>
): string {
  const locale = currentLocale()
  const template = xmTranslations[xmLocale]?.[key] || (xmLocale === "en" ? key : key)
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match
  )
}

if (typeof document !== "undefined") {
  const locale = currentLocale()
  document.documentElement.lang = locale ? (HTML_LANG[locale] ?? locale) : "en"
}
