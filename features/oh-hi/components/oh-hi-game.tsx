"use client"

import "@/styles/games/oh-hi.css"

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { Check, Clock3, Lightbulb, LockKeyhole, RotateCcw, Undo2 } from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { GameRulesDialog } from "@/components/game-rules-dialog"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useLocale } from "@/lib/locale-context"
import {
  changeOhHiCell,
  createOhHiGame,
  createOhHiPuzzle,
  getOhHiViolations,
  hintOhHi,
  undoOhHi,
  type OhHiGameState,
  type OhHiSize,
  type OhHiTile,
} from "@/features/oh-hi/engine"

const COPY = {
  zh: {
    title: "双色逻辑 · 0h h1", subtitle: "两种颜色，三条规则。", size: "棋盘大小", moves: "步数", time: "用时", filled: "已填", newGame: "新一局", undo: "撤销", hint: "提示", rules: "玩法", close: "关闭", ready: "点按格子：圆形 → 菱形 → 空白", complete: "完成！每一行、每一列都符合规则。", hintUsed: "已提示一个格子，可撤销。", triple: "同色不能连续出现三个", balance: "每行、每列两种颜色数量应相等", duplicate: "完整的行或列不能完全相同", rule1: "每行、每列不能有连续三个同色格子。", rule2: "每行、每列两种颜色各占一半。", rule3: "任意两行、任意两列不能完全相同。", locked: "带锁的是题目线索，不能修改。", keyboard: "键盘：方向键移动；1 填圆形，2 填菱形，删除键清空。", row: "行", column: "列", empty: "空白", one: "圆形，第一种颜色", two: "菱形，第二种颜色", given: "固定线索", editable: "可填写", error: "违反规则", board: "双色逻辑棋盘", loading: "正在准备棋盘…", discardTitle: "开始新一局？", discard: "当前棋盘的进度将被清除。", cancel: "继续本局", confirm: "开始新局", credits: "原作 Q42 · 开源版 0h h1", license: "MIT 许可", source: "原作源码", progress: "填写进度",
  },
  en: {
    title: "0h h1 · Two Colors", subtitle: "Two colors. Three rules.", size: "Board size", moves: "Moves", time: "Time", filled: "Filled", newGame: "New game", undo: "Undo", hint: "Hint", rules: "How to play", close: "Close", ready: "Tap a tile: circle → diamond → empty", complete: "Complete! Every row and column follows all three rules.", hintUsed: "One tile revealed. You can undo it.", triple: "No three identical colors in a row", balance: "Both colors need equal counts in each line", duplicate: "Complete rows and columns must be different", rule1: "Never place three of the same color consecutively in a row or column.", rule2: "Every row and column contains equal numbers of both colors.", rule3: "No two rows, and no two columns, may be identical.", locked: "Locked tiles are clues and cannot be changed.", keyboard: "Keyboard: arrows to move; 1 for circle, 2 for diamond, Delete to clear.", row: "Row", column: "column", empty: "empty", one: "circle, first color", two: "diamond, second color", given: "fixed clue", editable: "editable", error: "rule conflict", board: "0h h1 puzzle board", loading: "Preparing the board…", discardTitle: "Start a new puzzle?", discard: "This will clear your current board's progress.", cancel: "Keep playing", confirm: "New puzzle", credits: "Original by Q42 · Open-source 0h h1", license: "MIT license", source: "Original source", progress: "Puzzle progress",
  },
  th: {
    title: "0h h1 · ตรรกะสองสี", subtitle: "สองสี สามกติกา", size: "ขนาดกระดาน", moves: "ครั้ง", time: "เวลา", filled: "เติมแล้ว", newGame: "เกมใหม่", undo: "ย้อนกลับ", hint: "คำใบ้", rules: "วิธีเล่น", close: "ปิด", ready: "แตะช่อง: วงกลม → ข้าวหลามตัด → ว่าง", complete: "สำเร็จ! ทุกแถวและคอลัมน์ถูกต้องตามกติกา", hintUsed: "เผยคำตอบหนึ่งช่องแล้ว สามารถย้อนกลับได้", triple: "ห้ามสีเดียวกันเรียงติดกันสามช่อง", balance: "แต่ละแถวและคอลัมน์ต้องมีทั้งสองสีเท่ากัน", duplicate: "แถวหรือคอลัมน์ที่เติมครบต้องไม่เหมือนกัน", rule1: "ห้ามมีสีเดียวกันติดกันสามช่องในแถวหรือคอลัมน์", rule2: "แต่ละแถวและคอลัมน์ต้องมีจำนวนทั้งสองสีเท่ากัน", rule3: "ห้ามมีสองแถวหรือสองคอลัมน์ที่เหมือนกันทั้งหมด", locked: "ช่องที่มีแม่กุญแจเป็นโจทย์ ไม่สามารถเปลี่ยนได้", keyboard: "แป้นพิมพ์: ลูกศรเพื่อย้าย; 1 วงกลม, 2 ข้าวหลามตัด, Delete ล้างช่อง", row: "แถว", column: "คอลัมน์", empty: "ว่าง", one: "วงกลม สีแรก", two: "ข้าวหลามตัด สีที่สอง", given: "โจทย์คงที่", editable: "เติมได้", error: "ขัดกับกติกา", board: "กระดานตรรกะสองสี", loading: "กำลังเตรียมกระดาน…", discardTitle: "เริ่มโจทย์ใหม่หรือไม่?", discard: "ความคืบหน้าบนกระดานปัจจุบันจะถูกล้าง", cancel: "เล่นต่อ", confirm: "เริ่มใหม่", credits: "ต้นฉบับโดย Q42 · 0h h1 โอเพนซอร์ส", license: "ใบอนุญาต MIT", source: "ซอร์สต้นฉบับ", progress: "ความคืบหน้าของโจทย์",
  },
} as const

/** Count only active foreground play; browser suspension never adds hidden time. */
function usePlayTimer(running: boolean, round: number) {
  const accumulated = useRef(0)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    accumulated.current = 0
    setSeconds(0)
  }, [round])

  useEffect(() => {
    if (!running) return
    let previous = performance.now()
    let visible = !document.hidden
    const update = () => {
      const now = performance.now()
      if (visible) accumulated.current += now - previous
      previous = now
      visible = !document.hidden
      setSeconds(Math.floor(accumulated.current / 1000))
    }
    const interval = window.setInterval(update, 250)
    document.addEventListener("visibilitychange", update)
    return () => {
      update()
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", update)
    }
  }, [running, round])
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`
}

export function OhHiGame() {
  const { locale, t } = useLocale()
  const copy = COPY[locale]
  const [game, setGame] = useState<OhHiGameState | null>(null)
  const [started, setStarted] = useState(false)
  const [round, setRound] = useState(0)
  const [selected, setSelected] = useState(0)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [pendingSize, setPendingSize] = useState<OhHiSize | null>(null)
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    // Generate after hydration, without showing a deterministic puzzle first.
    const timer = window.setTimeout(() => {
      const next = createOhHiGame(createOhHiPuzzle(6))
      setGame(next)
      setSelected(next.board.findIndex(tile => tile === 0))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const violations = useMemo(() => game ? getOhHiViolations(game.board, game.puzzle.size) : null, [game])
  const complete = Boolean(game && !game.board.includes(0) && violations?.issues.size === 0)
  const time = usePlayTimer(started && !complete && !rulesOpen && pendingSize === null, round)

  function startNewGame(size: OhHiSize) {
    const next = createOhHiGame(createOhHiPuzzle(size))
    setGame(next)
    setSelected(next.board.findIndex(tile => tile === 0))
    setStarted(false)
    setRound(current => current + 1)
    setPendingSize(null)
  }

  function requestNewGame(size: OhHiSize) {
    if (game && game.moves > 0 && !complete) setPendingSize(size)
    else startNewGame(size)
  }

  function changeCell(index: number, value?: OhHiTile) {
    if (!game || game.puzzle.givens[index] !== 0 || complete) return
    setSelected(index)
    setStarted(true)
    setGame(current => current ? changeOhHiCell(current, index, value) : current)
  }

  function handleCellKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!game) return
    if (["1", "2", "0", "Delete", "Backspace"].includes(event.key)) {
      event.preventDefault()
      changeCell(index, event.key === "1" ? 1 : event.key === "2" ? 2 : 0)
      return
    }
    const size = game.puzzle.size
    const row = Math.floor(index / size)
    const column = index % size
    const destination: Partial<Record<string, number>> = {
      ArrowUp: Math.max(0, row - 1) * size + column,
      ArrowDown: Math.min(size - 1, row + 1) * size + column,
      ArrowLeft: row * size + Math.max(0, column - 1),
      ArrowRight: row * size + Math.min(size - 1, column + 1),
    }
    const next = destination[event.key]
    if (next !== undefined) {
      event.preventDefault()
      setSelected(next)
      cellRefs.current[next]?.focus()
    }
  }

  const status = complete ? copy.complete
    : violations?.issues.has("triple") ? copy.triple
      : violations?.issues.has("balance") ? copy.balance
        : violations?.issues.has("duplicate") ? copy.duplicate
          : game?.highlighted !== null && game?.highlighted !== undefined ? copy.hintUsed : copy.ready
  const hasErrors = Boolean(violations?.issues.size)
  const filled = game?.board.filter(tile => tile !== 0).length ?? 0

  return (
    <div className="game-page" data-page="oh-hi">
      <GameHeader homeLabel={t("appName")} title={copy.title} layout="centered" />
      <main className="game-content oh-hi-content" data-slot="game-content">
        <section className="oh-hi-panel" aria-label={copy.title}>
          <div className="oh-hi-intro">
            <div>
              <p className="oh-hi-eyebrow">0h h1</p>
              <p className="oh-hi-subtitle">{copy.subtitle}</p>
            </div>
            <div className="oh-hi-sizes" role="group" aria-label={copy.size}>
              {([4, 6, 8] as const).map(size => (
                <button key={size} type="button" aria-pressed={game?.puzzle.size === size} aria-label={`${copy.size} ${size} × ${size}`} onClick={() => { if (game?.puzzle.size !== size) requestNewGame(size) }} disabled={!game}>
                  {size} × {size}
                </button>
              ))}
            </div>
          </div>

          <div className="oh-hi-stats">
            <div><span>{copy.moves}</span><strong>{game?.moves ?? 0}</strong></div>
            <div><span><Clock3 aria-hidden="true" />{copy.time}</span><strong>{time}</strong></div>
            <div><span>{copy.filled}</span><strong>{filled}<small> / {game?.board.length ?? 36}</small></strong></div>
          </div>

          {game ? (
            <div className="oh-hi-board" role="grid" aria-label={`${copy.board} ${game.puzzle.size} × ${game.puzzle.size}`} style={{ "--oh-hi-size": game.puzzle.size } as CSSProperties}>
              {Array.from({ length: game.puzzle.size }, (_, row) => (
                <div role="row" className="oh-hi-row" key={row}>
                  {Array.from({ length: game.puzzle.size }, (_, column) => {
                    const index = row * game.puzzle.size + column
                    const value = game.board[index]
                    const given = game.puzzle.givens[index] !== 0
                    const error = violations?.cells.has(index) ?? false
                    const label = `${copy.row} ${row + 1}, ${copy.column} ${column + 1}, ${value === 0 ? copy.empty : value === 1 ? copy.one : copy.two}, ${given ? copy.given : copy.editable}${error ? `, ${copy.error}` : ""}`
                    return (
                      <div role="gridcell" className="oh-hi-cell-slot" key={column}>
                        <button
                          ref={node => { cellRefs.current[index] = node }}
                          className="oh-hi-cell" type="button" data-value={value} data-given={given} data-error={error} data-hint={game.highlighted === index}
                          aria-label={label} aria-disabled={given || complete} tabIndex={selected === index ? 0 : -1}
                          onClick={() => changeCell(index)} onFocus={() => setSelected(index)} onKeyDown={event => handleCellKey(event, index)}
                        >
                          {value !== 0 && <span className="oh-hi-symbol" aria-hidden="true" />}
                          {given && <LockKeyhole className="oh-hi-lock" aria-hidden="true" />}
                          {error && <span className="oh-hi-conflict" aria-hidden="true">!</span>}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ) : <div className="oh-hi-loading" role="status" aria-busy="true">{copy.loading}</div>}

          <div className="oh-hi-progress" role="progressbar" aria-label={copy.progress} aria-valuemin={0} aria-valuemax={game?.board.length ?? 36} aria-valuenow={filled}>
            <span style={{ width: `${game ? filled / game.board.length * 100 : 0}%` }} />
          </div>
          <p className="oh-hi-status" role="status" aria-live="polite" data-tone={complete ? "success" : hasErrors ? "danger" : "neutral"}>
            {complete && <Check aria-hidden="true" />}{status}
          </p>

          <div className="oh-hi-actions">
            <button type="button" disabled={!game?.history.length} onClick={() => setGame(current => current ? undoOhHi(current) : current)}><Undo2 aria-hidden="true" /><span>{copy.undo}</span></button>
            <button type="button" disabled={!game || complete || game.hintsUsed >= 3} onClick={() => { setStarted(true); setGame(current => current ? hintOhHi(current) : current) }}><Lightbulb aria-hidden="true" /><span>{copy.hint}<small> {3 - (game?.hintsUsed ?? 0)}</small></span></button>
            <button type="button" disabled={!game} onClick={() => requestNewGame(game?.puzzle.size ?? 6)}><RotateCcw aria-hidden="true" /><span>{copy.newGame}</span></button>
          </div>
        </section>

        <aside className="oh-hi-guide">
          <div className="oh-hi-legend" aria-hidden="true">
            <span><i data-color="1" />{copy.one}</span><span><i data-color="2" />{copy.two}</span>
          </div>
          <GameRulesDialog triggerLabel={copy.rules} closeLabel={copy.close} triggerClassName="oh-hi-rules-button" onOpenChange={setRulesOpen}>
            <ol className="oh-hi-rule-list"><li>{copy.rule1}</li><li>{copy.rule2}</li><li>{copy.rule3}</li></ol>
            <p className="oh-hi-rule-note">{copy.locked}</p><p className="oh-hi-rule-note">{copy.ready}</p><p className="oh-hi-rule-note">{copy.keyboard}</p>
          </GameRulesDialog>
          <p className="oh-hi-credit">{copy.credits}<br /><a href="/licenses/oh-hi.txt" target="_blank" rel="noreferrer">{copy.license}</a><span aria-hidden="true"> · </span><a href="https://github.com/florisluiten/0hh1" target="_blank" rel="noreferrer">{copy.source}</a></p>
        </aside>
      </main>

      <Dialog open={pendingSize !== null} onOpenChange={open => { if (!open) setPendingSize(null) }}>
        <DialogContent closeLabel={copy.close}>
          <DialogTitle>{copy.discardTitle}</DialogTitle>
          <DialogDescription>{copy.discard}</DialogDescription>
          <div className="oh-hi-confirm-actions"><button type="button" onClick={() => setPendingSize(null)}>{copy.cancel}</button><button type="button" data-primary="true" onClick={() => { if (pendingSize) startNewGame(pendingSize) }}>{copy.confirm}</button></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
