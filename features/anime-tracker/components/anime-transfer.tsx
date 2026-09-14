"use client"

import { useEffect, useRef, useState } from "react"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Copy,
  Download,
  Loader2,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLocale } from "@/lib/locale-context"
import { ANIME_STORAGE_KEY, readAnimeStorage } from "../storage"
import type { AnimeRecord, AnimeStatus } from "../types"
import { TRANSFER_COPY } from "../transfer/copy"
import {
  claimAnimeTransfer,
  completeAnimeTransfer,
  getTransferReceiver,
  sendAnimeTransfer,
} from "../transfer/client"
import {
  TransferError,
  createTransferPayload,
  formatTransferCode,
  mergeTransfer,
  normalizeTransferCode,
  previewTransfer,
  readTransferBackup,
  saveTransferImport,
  validTransferCode,
  type ClaimedTransfer,
  type CreatedTransfer,
  type TransferChoice,
  type TransferPayload,
} from "../transfer/model"
import type { TranslationKey } from "@/lib/i18n"

const STATUS_KEYS: Record<AnimeStatus, TranslationKey> = {
  watching: "statusWatching",
  completed: "statusCompleted",
  planned: "statusPlanned",
  paused: "statusPaused",
  dropped: "statusDropped",
}

export function AnimeTransfer({
  records,
  ready,
  canPersist,
  online,
  onImported,
}: {
  records: AnimeRecord[]
  ready: boolean
  canPersist: boolean
  online: boolean
  onImported: (records: AnimeRecord[]) => void
}) {
  const { locale, t } = useLocale()
  const copy = TRANSFER_COPY[locale]
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"send" | "receive">("send")
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [created, setCreated] = useState<CreatedTransfer | null>(null)
  const [sentCount, setSentCount] = useState<number | null>(null)
  const [claimed, setClaimed] = useState<ClaimedTransfer | null>(null)
  const [code, setCode] = useState("")
  const [claimedCode, setClaimedCode] = useState("")
  const [local, setLocal] = useState<{
    records: AnimeRecord[]
    raw: string | null
  } | null>(null)
  const [choices, setChoices] = useState<Record<string, TransferChoice>>({})
  const [imported, setImported] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [qr, setQr] = useState("")
  const [now, setNow] = useState(0)
  const outgoing = useRef<{
    requestId: string
    payload: TransferPayload
  } | null>(null)
  const rows =
    claimed && local
      ? previewTransfer(local.records, claimed.payload.records)
      : []
  const expired = Boolean(
    (mode === "send" ? created : claimed)?.expiresAt &&
      now >= (mode === "send" ? created! : claimed!).expiresAt,
  )

  useEffect(() => {
    const acceptHash = () => {
      const params = new URLSearchParams(window.location.hash.slice(1))
      const value = normalizeTransferCode(params.get("transfer") ?? "")
      if (!validTransferCode(value)) return
      setCode(formatTransferCode(value))
      setMode("receive")
      setOpen(true)
      // Never put a bearer code in the query, referrer or a server request URL.
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      )
    }
    acceptHash()
    window.addEventListener("hashchange", acceptHash)
    return () => window.removeEventListener("hashchange", acceptHash)
  }, [])

  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [open])

  useEffect(() => {
    setQr("")
    if (!created || !open) return
    let cancelled = false
    const url = new URL("/anime-tracker", window.location.origin)
    url.hash = `transfer=${created.code}`
    void import("qrcode")
      .then((module) =>
        module.toDataURL(url.href, {
          width: 224,
          margin: 4,
          errorCorrectionLevel: "M",
          color: { dark: "#102a30", light: "#ffffff" },
        }),
      )
      .then((value) => {
        if (!cancelled) setQr(value)
      })
      .catch(() => {
        /* The visible text code remains usable. */
      })
    return () => {
      cancelled = true
    }
  }, [created, open])

  const run = async (operation: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await operation()
    } catch (error) {
      setError(
        copy.errors[error instanceof TransferError ? error.code : "NETWORK"],
      )
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const readLocal = () => {
    if (!canPersist) throw new TransferError("STORAGE_FAILED")
    const current = readAnimeStorage(window.localStorage)
    if (!current.canPersist || current.warning)
      throw new TransferError("STORAGE_FAILED")
    const snapshot = {
      records: current.records,
      raw: window.localStorage.getItem(ANIME_STORAGE_KEY),
    }
    setLocal(snapshot)
    setChoices({})
    return snapshot
  }

  const send = () =>
    run(async () => {
      if (!online) throw new TransferError("NETWORK")
      if (!outgoing.current || (created && Date.now() >= created.expiresAt)) {
        outgoing.current = {
          requestId: crypto.randomUUID(),
          payload: createTransferPayload(records),
        }
        setSentCount(outgoing.current.payload.records.length)
      }
      setCreated(
        await sendAnimeTransfer(
          outgoing.current.payload,
          outgoing.current.requestId,
        ),
      )
    })

  const receive = () =>
    run(async () => {
      const normalized = normalizeTransferCode(code)
      if (!validTransferCode(normalized))
        throw new TransferError("INVALID_CODE")
      if (created?.code === normalized) {
        setError(copy.sameDevice)
        return
      }
      readLocal()
      if (!online) throw new TransferError("NETWORK")
      const result = await claimAnimeTransfer(normalized, getTransferReceiver())
      // Re-read AFTER the network request, not from a potentially stale React render.
      readLocal()
      setClaimed(result)
      setClaimedCode(normalized)
      setImported(false)
      setCompleted(false)
    })

  const finish = () =>
    run(async () => {
      if (!claimed || !local) return
      if (!imported) {
        if (!canPersist) throw new TransferError("STORAGE_FAILED")
        if (Date.now() >= claimed.expiresAt)
          throw new TransferError("NOT_FOUND")
        const merged = mergeTransfer(
          local.records,
          claimed.payload.records,
          choices,
          () => crypto.randomUUID(),
        )
        saveTransferImport(
          window.localStorage,
          local.raw,
          merged,
          claimed.transferId,
        )
        onImported(merged)
        setImported(true)
      }
      await completeAnimeTransfer(claimedCode, getTransferReceiver())
      setCompleted(true)
      setClaimed(null)
      setLocal(null)
      setChoices({})
      setCode("")
      setClaimedCode("")
    })

  const downloadBackup = () => {
    const backup = readTransferBackup(window.localStorage)
    if (!backup) {
      setNotice(copy.noBackup)
      return
    }
    const url = URL.createObjectURL(
      new Blob([backup.before ?? "[]"], { type: "application/json" }),
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "xm-games-watchlist-before-import.json"
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const details = (record: AnimeRecord) => (
    <div className="grid min-w-0 gap-1 break-words text-xs text-muted-foreground">
      <p>
        {t(STATUS_KEYS[record.status])} · {copy.progress}{" "}
        {record.currentEpisode}/{record.totalEpisodes ?? "—"} · {copy.rating}{" "}
        {record.rating ?? "—"}
      </p>
      {record.notes && (
        <p className="whitespace-pre-wrap">
          {copy.notes}: {record.notes}
        </p>
      )}
    </div>
  )

  return (
    <>
      <Button
        variant="outline"
        disabled={!ready}
        onClick={() => {
          setOpen(true)
          setError("")
          setNotice("")
        }}
      >
        <Smartphone aria-hidden="true" />
        {copy.title}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busyRef.current) setOpen(value)
        }}
      >
        <DialogContent
          className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"
          closeLabel={copy.close}
          showCloseButton={!busy}
        >
          <DialogHeader>
            <DialogTitle className="pr-6">{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2" aria-label={copy.title}>
            <Button
              className="h-auto min-h-11 whitespace-normal"
              variant={mode === "send" ? "default" : "outline"}
              aria-pressed={mode === "send"}
              disabled={busy || (imported && !completed)}
              onClick={() => {
                setMode("send")
                setError("")
                setNotice("")
              }}
            >
              <ArrowUpFromLine aria-hidden="true" />
              {copy.send}
            </Button>
            <Button
              className="h-auto min-h-11 whitespace-normal"
              variant={mode === "receive" ? "default" : "outline"}
              aria-pressed={mode === "receive"}
              disabled={busy}
              onClick={() => {
                setMode("receive")
                setError("")
                setNotice("")
              }}
            >
              <ArrowDownToLine aria-hidden="true" />
              {copy.receive}
            </Button>
          </div>
          {!online && (
            <p role="status" className="text-sm text-muted-foreground">
              {copy.offline}
            </p>
          )}
          {mode === "send" ? (
            <div className="grid min-w-0 gap-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {copy.privacy}
              </p>
              <p className="text-sm">
                {sentCount ?? records.length} {copy.records} ·{" "}
                {copy.sourceUnchanged}
              </p>
              {created && !expired ? (
                <div className="grid justify-items-center gap-3 rounded-xl border border-border p-4">
                  <Label htmlFor="anime-transfer-output">{copy.code}</Label>
                  <Input
                    id="anime-transfer-output"
                    readOnly
                    value={formatTransferCode(created.code)}
                    className="text-center font-mono text-lg tracking-widest"
                    onFocus={(event) => event.target.select()}
                  />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          formatTransferCode(created.code),
                        )
                        setNotice(copy.copied)
                      } catch {
                        setNotice(copy.copyFailed)
                      }
                    }}
                  >
                    <Copy aria-hidden="true" />
                    {copy.copy}
                  </Button>
                  {qr && (
                    // Local, generated QR image; never sent to an image service.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qr}
                      width={224}
                      height={224}
                      className="max-w-full rounded-lg"
                      alt={copy.scan}
                    />
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    {copy.scan}
                  </p>
                  <p className="text-sm">
                    {copy.expires}{" "}
                    {new Date(created.expiresAt).toLocaleTimeString(locale)}
                  </p>
                </div>
              ) : (
                <>
                  {created && (
                    <p role="status" className="text-sm">
                      {copy.expired}
                    </p>
                  )}
                  {!records.length && (
                    <p className="text-sm text-muted-foreground">
                      {copy.empty}
                    </p>
                  )}
                  <Button
                    disabled={busy || !online || !records.length || !canPersist}
                    onClick={send}
                  >
                    {busy && (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    )}
                    {busy ? copy.busy : copy.generate}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="grid min-w-0 gap-4">
              {!canPersist && (
                <p role="alert" className="text-sm">
                  {copy.protected}
                </p>
              )}
              {!claimed && !completed && (
                <form
                  className="grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void receive()
                  }}
                >
                  <Label htmlFor="anime-transfer-input">{copy.code}</Label>
                  <Input
                    id="anime-transfer-input"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={32}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="font-mono tracking-widest"
                  />
                  <Button
                    type="submit"
                    disabled={busy || !online || !canPersist}
                  >
                    {busy && (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    )}
                    {busy ? copy.busy : copy.preview}
                  </Button>
                </form>
              )}
              {claimed && !imported && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {copy.previewHint}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm" role="status">
                    <span>
                      {copy.added}{" "}
                      {rows.filter((row) => row.kind === "new").length}
                    </span>
                    <span>
                      {copy.duplicate}{" "}
                      {rows.filter((row) => row.kind === "duplicate").length}
                    </span>
                    <span>
                      {copy.conflict}{" "}
                      {rows.filter((row) => row.kind === "conflict").length}
                    </span>
                  </div>
                  <div className="grid max-h-[35dvh] gap-3 overflow-y-auto overscroll-contain pr-1">
                    {rows.map((row) => (
                      <section
                        key={row.incoming.id}
                        className="grid min-w-0 gap-2 rounded-xl border border-border p-3"
                      >
                        <h3 className="break-words text-sm font-semibold">
                          {row.incoming.title}
                        </h3>
                        <p className="text-xs font-medium">{copy.incoming}</p>
                        {details(row.incoming)}
                        {row.local && (
                          <>
                            <p className="text-xs font-medium">{copy.local}</p>
                            {details(row.local)}
                          </>
                        )}
                        {row.ambiguous && (
                          <p className="text-xs text-muted-foreground">
                            {copy.ambiguous}
                          </p>
                        )}
                        {row.kind === "conflict" && (
                          <select
                            aria-label={`${copy.conflict}: ${row.incoming.title}`}
                            className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                            value={choices[row.incoming.id] ?? "local"}
                            onChange={(event) =>
                              setChoices((current) => ({
                                ...current,
                                [row.incoming.id]: event.target
                                  .value as TransferChoice,
                              }))
                            }
                          >
                            <option value="local">{copy.keep}</option>
                            {row.local && !row.ambiguous && (
                              <option value="incoming">{copy.replace}</option>
                            )}
                            <option value="both">{copy.both}</option>
                          </select>
                        )}
                      </section>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {copy.expires}{" "}
                    {new Date(claimed.expiresAt).toLocaleTimeString(locale)}
                  </p>
                  {expired && (
                    <p role="alert" className="text-sm">
                      {copy.expired}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        readLocal()
                      })
                    }
                  >
                    {copy.refresh}
                  </Button>
                  <Button
                    disabled={busy || !online || !canPersist || expired}
                    onClick={finish}
                  >
                    {busy && (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    )}
                    {busy ? copy.busy : copy.confirm}
                  </Button>
                </>
              )}
              {imported && !completed && (
                <>
                  <p role="status" className="text-sm">
                    {copy.pending}
                  </p>
                  <Button disabled={busy || !online} onClick={finish}>
                    {busy ? copy.busy : copy.retry}
                  </Button>
                </>
              )}
              {completed && (
                <p role="status" className="flex items-start gap-2 text-sm">
                  <Check className="size-5 shrink-0" aria-hidden="true" />
                  {copy.success}
                </p>
              )}
              {(completed || (claimed && expired && !imported)) && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setClaimed(null)
                    setClaimedCode("")
                    setCode("")
                    setLocal(null)
                    setChoices({})
                    setImported(false)
                    setCompleted(false)
                    setError("")
                  }}
                >
                  {copy.restart}
                </Button>
              )}
              <Button
                variant="outline"
                className="h-auto min-h-11 whitespace-normal"
                disabled={busy}
                onClick={downloadBackup}
              >
                <Download aria-hidden="true" />
                {copy.backup}
              </Button>
            </div>
          )}
          {error && (
            <p role="alert" className="break-words text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
