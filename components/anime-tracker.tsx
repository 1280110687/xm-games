"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Edit3,
  Film,
  ImageIcon,
  Loader2,
  Minus,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Star,
  Trash2,
  Tv,
  Wifi,
  WifiOff,
} from "lucide-react"

import { GameHeader } from "@/components/game-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  cacheCoverImage,
  readCachedCoverBlob,
} from "@/features/anime-tracker/cover-cache"
import {
  applyAnimeSearchTitle,
  getBestMatchedTitle,
  normalizeSearchQuery,
  searchAnimeOnline,
} from "@/features/anime-tracker/search"
import {
  readCachedAnimeSearch,
  writeCachedAnimeSearch,
} from "@/features/anime-tracker/search-cache"
import {
  readAnimeImageCache,
  readAnimeStorage,
  writeAnimeImageCache,
  writeAnimeStorage,
} from "@/features/anime-tracker/storage"
import type {
  AnimeMediaType,
  AnimeRecord,
  AnimeSearchResult,
  AnimeStatus,
} from "@/features/anime-tracker/types"
import type { TranslationKey } from "@/lib/i18n"
import { useLocale } from "@/lib/locale-context"
import { cn } from "@/lib/utils"

const STATUS_TRANSLATION_KEYS: Record<AnimeStatus, TranslationKey> = {
  watching: "statusWatching",
  completed: "statusCompleted",
  planned: "statusPlanned",
  paused: "statusPaused",
  dropped: "statusDropped",
}

const TYPE_TRANSLATION_KEYS: Record<AnimeMediaType, TranslationKey> = {
  anime: "typeAnime",
  drama: "typeDrama",
  movie: "typeMovie",
}

const STATUS_STYLES: Record<AnimeStatus, string> = {
  watching: "border-sky-400/30 bg-sky-400/10 text-sky-600 dark:text-sky-300",
  completed:
    "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
  planned: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  paused: "border-orange-400/30 bg-orange-400/10 text-orange-600 dark:text-orange-300",
  dropped: "border-rose-400/30 bg-rose-400/10 text-rose-600 dark:text-rose-300",
}

interface AnimeFormState {
  title: string
  totalEpisodes: string
  currentEpisode: string
  status: AnimeStatus
  type: AnimeMediaType
  rating: string
  notes: string
  imageUrl: string
}

type SearchPhase =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "offline"
  | "error"

const EMPTY_FORM: AnimeFormState = {
  title: "",
  totalEpisodes: "",
  currentEpisode: "0",
  status: "watching",
  type: "anime",
  rating: "",
  notes: "",
  imageUrl: "",
}

function statusIcon(status: AnimeStatus) {
  switch (status) {
    case "watching":
      return <Play aria-hidden="true" />
    case "completed":
      return <CheckCircle2 aria-hidden="true" />
    case "planned":
      return <Clock3 aria-hidden="true" />
    case "paused":
      return <Pause aria-hidden="true" />
    case "dropped":
      return <Trash2 aria-hidden="true" />
  }
}

function mediaIcon(type: AnimeMediaType, className = "h-4 w-4") {
  const Icon = type === "anime" ? Tv : Film
  return <Icon className={className} aria-hidden="true" />
}

function createAnimeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `anime-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function parseNonNegativeInteger(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0
}

function parseEpisodeTotal(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null
}

function parsePersonalRating(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 10
    ? parsed
    : null
}

function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}

function useCoverSource(sourceUrl: string, shouldPersist: boolean): string {
  const [cachedUrl, setCachedUrl] = useState("")

  useEffect(() => {
    let isCurrent = true
    let objectUrl = ""
    const controller = new AbortController()

    setCachedUrl("")
    if (!sourceUrl) return () => controller.abort()

    const applyCachedBlob = async () => {
      const cachedBlob = await readCachedCoverBlob(sourceUrl)
      if (cachedBlob && isCurrent) {
        objectUrl = URL.createObjectURL(cachedBlob)
        setCachedUrl(objectUrl)
        return true
      }
      return false
    }

    void (async () => {
      const found = await applyCachedBlob()
      if (!found && shouldPersist && navigator.onLine) {
        const cached = await cacheCoverImage(sourceUrl, undefined, controller.signal)
        if (cached && isCurrent) await applyCachedBlob()
      }
    })()

    return () => {
      isCurrent = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [shouldPersist, sourceUrl])

  return cachedUrl || sourceUrl
}

/* eslint-disable @next/next/no-img-element -- Arbitrary legacy URLs and cached Blob URLs cannot use a fixed Next Image allow-list. */
function AnimeCover({
  sourceUrl,
  title,
  type = "anime",
  className,
  persist = true,
}: {
  sourceUrl: string
  title: string
  type?: AnimeMediaType
  className?: string
  persist?: boolean
}) {
  const resolvedUrl = useCoverSource(sourceUrl, persist)
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [resolvedUrl])

  if (!resolvedUrl || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-accent/20 text-muted-foreground",
          className,
        )}
        role="img"
        aria-label={title}
      >
        {mediaIcon(type, "h-8 w-8")}
      </div>
    )
  }

  return (
    <img
      src={resolvedUrl}
      alt={title}
      className={cn("object-cover", className)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
/* eslint-enable @next/next/no-img-element */

function SearchResultItem({
  result,
  query,
  selectedCover,
  onUseTitle,
  onUseCover,
  t,
}: {
  result: AnimeSearchResult
  query: string
  selectedCover: string
  onUseTitle: () => void
  onUseCover: () => void
  t: (key: TranslationKey) => string
}) {
  const matchedTitle = getBestMatchedTitle(query, result)
  const coverSelected = Boolean(result.imageUrl) && result.imageUrl === selectedCover

  return (
    <article
      className="surface-card grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-2xl border border-border/70 bg-card/70 p-2.5 shadow-sm"
      role="listitem"
    >
      <AnimeCover
        sourceUrl={result.imageUrl}
        title={result.title}
        className="h-24 w-[72px] rounded-xl"
        persist={false}
      />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="line-clamp-1 text-sm font-semibold">{result.title}</h4>
            {result.originalTitle && result.originalTitle !== result.title && (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {result.originalTitle}
              </p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
            {result.source}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {result.year && <span>{result.year}</span>}
          {result.mediaType && <span>{result.mediaType}</span>}
          {result.totalEpisodes && (
            <span>
              {result.totalEpisodes} {t("episodesUnit")}
            </span>
          )}
          {result.externalScore !== null && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              {result.externalScore}
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {matchedTitle}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUseTitle}
            aria-label={`${t("animeUseTitle")}: ${matchedTitle}`}
          >
            {t("animeUseTitle")}
          </Button>
          <Button
            type="button"
            variant={coverSelected ? "secondary" : "default"}
            size="sm"
            disabled={!result.imageUrl}
            onClick={onUseCover}
            aria-label={`${
              coverSelected ? t("animeCoverSelected") : t("animeUseCover")
            }: ${result.title}`}
          >
            {coverSelected ? <Check aria-hidden="true" /> : <ImageIcon aria-hidden="true" />}
            {coverSelected ? t("animeCoverSelected") : t("animeUseCover")}
          </Button>
        </div>
      </div>
    </article>
  )
}

export function AnimeTracker() {
  const { t, locale } = useLocale()
  const isOnline = useOnlineStatus()
  const [animeList, setAnimeList] = useState<AnimeRecord[]>([])
  const [imageCache, setImageCache] = useState<Record<string, string>>({})
  const [storageReady, setStorageReady] = useState(false)
  const [canPersistAnime, setCanPersistAnime] = useState(false)
  const [canPersistImages, setCanPersistImages] = useState(false)
  const [storageProtected, setStorageProtected] = useState(false)

  const [activeTab, setActiveTab] = useState<AnimeStatus | "all">("watching")
  const [libraryQuery, setLibraryQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AnimeFormState>(EMPTY_FORM)
  const [deleteCandidate, setDeleteCandidate] = useState<AnimeRecord | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<AnimeSearchResult[]>([])
  const [searchPhase, setSearchPhase] = useState<SearchPhase>("idle")
  const [showingCachedResults, setShowingCachedResults] = useState(false)
  const requestSequence = useRef(0)
  const searchController = useRef<AbortController | null>(null)
  const searchDebounceTimer = useRef<number | null>(null)
  const previousOnlineStatus = useRef(isOnline)

  useEffect(() => {
    const animeStorage = readAnimeStorage(window.localStorage)
    const legacyImageCache = readAnimeImageCache(window.localStorage)
    setAnimeList(animeStorage.records)
    setImageCache(legacyImageCache.cache)
    setCanPersistAnime(animeStorage.canPersist)
    setCanPersistImages(legacyImageCache.canPersist)
    setStorageProtected(!animeStorage.canPersist)
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady || !canPersistAnime) return
    if (!writeAnimeStorage(window.localStorage, animeList)) {
      setCanPersistAnime(false)
      setStorageProtected(true)
    }
  }, [animeList, canPersistAnime, storageReady])

  useEffect(() => {
    if (!storageReady || !canPersistImages) return
    if (!writeAnimeImageCache(window.localStorage, imageCache)) {
      setCanPersistImages(false)
    }
  }, [canPersistImages, imageCache, storageReady])

  const clearSearchState = useCallback(() => {
    if (searchDebounceTimer.current !== null) {
      window.clearTimeout(searchDebounceTimer.current)
      searchDebounceTimer.current = null
    }
    searchController.current?.abort()
    searchController.current = null
    requestSequence.current += 1
    setSearchResults([])
    setSearchPhase("idle")
    setShowingCachedResults(false)
  }, [])

  const resetDialog = useCallback(() => {
    clearSearchState()
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSearchQuery("")
  }, [clearSearchState])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    resetDialog()
  }, [resetDialog])

  const openAddDialog = () => {
    resetDialog()
    setDialogOpen(true)
  }

  const openEditDialog = (anime: AnimeRecord) => {
    clearSearchState()
    setEditingId(anime.id)
    setForm({
      title: anime.title,
      totalEpisodes: anime.totalEpisodes?.toString() ?? "",
      currentEpisode: anime.currentEpisode.toString(),
      status: anime.status,
      type: anime.type,
      rating: anime.rating?.toString() ?? "",
      notes: anime.notes,
      imageUrl: anime.imageUrl,
    })
    setSearchQuery(anime.title)
    setDialogOpen(true)
  }

  const runSearch = useCallback(async () => {
    const querySnapshot = searchQuery
    const mediaTypeSnapshot = form.type
    const normalized = normalizeSearchQuery(querySnapshot)
    if (normalized.length < 2) {
      clearSearchState()
      return
    }

    searchController.current?.abort()
    const controller = new AbortController()
    searchController.current = controller
    const sequence = ++requestSequence.current

    let cachedResults: AnimeSearchResult[] = []
    setSearchResults([])
    setShowingCachedResults(false)
    try {
      const cached = readCachedAnimeSearch(
        window.localStorage,
        querySnapshot,
        mediaTypeSnapshot,
      )
      if (cached) {
        cachedResults = cached.results
        setSearchResults(cached.results)
        setShowingCachedResults(true)
      }
    } catch {
      // Search remains usable without localStorage.
    }

    if (!isOnline) {
      setSearchPhase(cachedResults.length > 0 ? "success" : "offline")
      if (searchController.current === controller) searchController.current = null
      return
    }

    setSearchPhase("loading")
    try {
      const results = await searchAnimeOnline(querySnapshot, mediaTypeSnapshot, {
        signal: controller.signal,
      })
      if (sequence !== requestSequence.current) return

      setSearchResults(results)
      setShowingCachedResults(false)
      setSearchPhase(results.length > 0 ? "success" : "empty")
      if (results.length > 0) {
        try {
          writeCachedAnimeSearch(window.localStorage, {
            query: querySnapshot,
            mediaType: mediaTypeSnapshot,
            cachedAt: Date.now(),
            results,
          })
        } catch {
          // The live result remains available even when the cache is blocked.
        }
      }
    } catch {
      if (controller.signal.aborted || sequence !== requestSequence.current) return
      setSearchPhase(cachedResults.length > 0 ? "success" : "error")
      setShowingCachedResults(cachedResults.length > 0)
    } finally {
      if (searchController.current === controller) searchController.current = null
    }
  }, [clearSearchState, form.type, isOnline, searchQuery])

  const updateSearchQuery = (value: string) => {
    clearSearchState()
    setSearchQuery(value)
  }

  const updateMediaType = (value: AnimeMediaType) => {
    clearSearchState()
    setForm((current) => ({ ...current, type: value }))
  }

  const runSearchImmediately = () => {
    if (searchDebounceTimer.current !== null) {
      window.clearTimeout(searchDebounceTimer.current)
      searchDebounceTimer.current = null
    }
    void runSearch()
  }

  useEffect(() => {
    if (!dialogOpen) return
    if (normalizeSearchQuery(searchQuery).length < 2) {
      clearSearchState()
      return
    }

    const timer = window.setTimeout(() => {
      if (searchDebounceTimer.current === timer) {
        searchDebounceTimer.current = null
      }
      void runSearch()
    }, 450)
    searchDebounceTimer.current = timer
    return () => {
      window.clearTimeout(timer)
      if (searchDebounceTimer.current === timer) {
        searchDebounceTimer.current = null
      }
    }
  }, [clearSearchState, dialogOpen, runSearch, searchQuery])

  useEffect(() => {
    if (previousOnlineStatus.current === isOnline) return
    previousOnlineStatus.current = isOnline
    if (!dialogOpen || normalizeSearchQuery(searchQuery).length < 2) return

    clearSearchState()
    void runSearch()
  }, [clearSearchState, dialogOpen, isOnline, runSearch, searchQuery])

  useEffect(
    () => () => {
      searchController.current?.abort()
      if (searchDebounceTimer.current !== null) {
        window.clearTimeout(searchDebounceTimer.current)
      }
    },
    [],
  )

  const applySearchTitle = (result: AnimeSearchResult) => {
    setForm((current) => applyAnimeSearchTitle(current, searchQuery, result))
  }

  const applySearchCover = (result: AnimeSearchResult) => {
    if (!result.imageUrl) return
    setForm((current) => ({ ...current, imageUrl: result.imageUrl }))
    setImageCache((current) => ({
      ...current,
      [normalizeSearchQuery(searchQuery)]: result.imageUrl,
      [normalizeSearchQuery(result.title)]: result.imageUrl,
    }))
  }

  const saveAnime = () => {
    const title = form.title.trim()
    if (!title) return
    const now = Date.now()
    const values = {
      title,
      totalEpisodes: parseEpisodeTotal(form.totalEpisodes),
      currentEpisode: parseNonNegativeInteger(form.currentEpisode),
      status: form.status,
      type: form.type,
      rating: parsePersonalRating(form.rating),
      notes: form.notes,
      imageUrl: form.imageUrl.trim(),
      updatedAt: now,
    }

    if (editingId) {
      setAnimeList((current) =>
        current.map((anime) =>
          anime.id === editingId ? { ...anime, ...values } : anime,
        ),
      )
    } else {
      setAnimeList((current) => [
        { id: createAnimeId(), ...values, addedAt: now },
        ...current,
      ])
    }

    if (values.imageUrl) {
      setImageCache((current) => ({
        ...current,
        [normalizeSearchQuery(title)]: values.imageUrl,
      }))
    }
    closeDialog()
  }

  const incrementEpisode = (id: string) => {
    setAnimeList((current) =>
      current.map((anime) => {
        if (anime.id !== id) return anime
        const currentEpisode = anime.currentEpisode + 1
        const isCompleted =
          anime.totalEpisodes !== null && currentEpisode >= anime.totalEpisodes
        return {
          ...anime,
          currentEpisode,
          status: isCompleted ? "completed" : anime.status,
          updatedAt: Date.now(),
        }
      }),
    )
  }

  const decrementEpisode = (id: string) => {
    setAnimeList((current) =>
      current.map((anime) => {
        if (anime.id !== id) return anime
        const currentEpisode = Math.max(0, anime.currentEpisode - 1)
        return {
          ...anime,
          currentEpisode,
          status:
            anime.status === "completed" &&
            anime.totalEpisodes !== null &&
            currentEpisode < anime.totalEpisodes
              ? "watching"
              : anime.status,
          updatedAt: Date.now(),
        }
      }),
    )
  }

  const statusCounts = useMemo(
    () => ({
      all: animeList.length,
      watching: animeList.filter((anime) => anime.status === "watching").length,
      completed: animeList.filter((anime) => anime.status === "completed").length,
      planned: animeList.filter((anime) => anime.status === "planned").length,
      paused: animeList.filter((anime) => anime.status === "paused").length,
      dropped: animeList.filter((anime) => anime.status === "dropped").length,
    }),
    [animeList],
  )

  const visibleAnime = useMemo(() => {
    const normalizedFilter = normalizeSearchQuery(libraryQuery)
    return animeList
      .filter((anime) => activeTab === "all" || anime.status === activeTab)
      .filter((anime) => {
        if (!normalizedFilter) return true
        return normalizeSearchQuery(`${anime.title} ${anime.notes}`).includes(
          normalizedFilter,
        )
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [activeTab, animeList, libraryQuery])

  const watchedEpisodes = animeList.reduce(
    (total, anime) => total + anime.currentEpisode,
    0,
  )

  return (
    <main
      className="app-shell game-content min-h-screen bg-background text-foreground"
      data-page="anime-tracker"
      data-slot="game-content"
    >
      <div className="app-container mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-7 lg:px-8">
        <GameHeader
          layout="tool"
          homeIcon="back"
          homeLabel={t("appName")}
          homeLabelMode="sr-only"
          title={t("animeTracker")}
          description={t("animeTrackerDescription")}
          className="mb-5"
          homeButtonClassName="border border-border/70 bg-card/70 shadow-sm"
          titleClassName="text-xl font-semibold tracking-tight sm:text-2xl"
          descriptionClassName="hidden text-sm text-muted-foreground sm:block"
          actions={
            <Button
              onClick={openAddDialog}
              className="game-actions rounded-full px-3 sm:px-4"
              aria-label={t("addAnime")}
            >
              <Plus aria-hidden="true" />
              <span className="hidden sm:inline">{t("addAnime")}</span>
            </Button>
          }
        />

        {storageProtected && (
          <div
            className="mb-5 flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
            <div>
              <p className="font-semibold">{t("animeStorageProtectionTitle")}</p>
              <p className="mt-1 text-muted-foreground">
                {t("animeStorageProtectionDescription")}
              </p>
            </div>
          </div>
        )}

        <section
          className="anime-overview game-summary surface-panel relative mb-5 overflow-hidden rounded-[28px] border border-border/70 bg-card/80 p-5 shadow-sm sm:p-7"
          data-slot="game-summary"
        >
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <Badge variant="outline" className="mb-3 rounded-full bg-background/60">
                {isOnline ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
                {isOnline ? t("animeSearchOnline") : t("animeSearchOffline")}
              </Badge>
              <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("animeTrackerDescription")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {t("animeLibrarySearchHint")}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3 text-center sm:min-w-24">
                <p className="text-2xl font-semibold">{animeList.length}</p>
                <p className="text-[11px] text-muted-foreground">{t("all")}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3 text-center sm:min-w-24">
                <p className="text-2xl font-semibold">{statusCounts.watching}</p>
                <p className="text-[11px] text-muted-foreground">{t("statusWatching")}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 px-3 py-3 text-center sm:min-w-24">
                <p className="text-2xl font-semibold">{watchedEpisodes}</p>
                <p className="text-[11px] text-muted-foreground">{t("episodesUnit")}</p>
              </div>
            </div>
          </div>
        </section>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as AnimeStatus | "all")}
          className="anime-workspace"
        >
          <section
            className="anime-filters game-settings surface-panel mb-5 rounded-3xl border border-border/70 bg-card/70 p-3 shadow-sm sm:p-4"
            data-slot="game-settings"
          >
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                  placeholder={t("animeFilterPlaceholder")}
                  aria-label={t("animeFilterPlaceholder")}
                  className="h-10 rounded-full bg-background/70 pl-9"
                />
              </div>
              <div className="overflow-x-auto pb-1 lg:pb-0">
                <TabsList className="h-auto min-w-max rounded-full bg-muted/70 p-1">
                  {(
                    [
                      ["all", "all"],
                      ["watching", "statusWatching"],
                      ["planned", "statusPlanned"],
                      ["completed", "statusCompleted"],
                      ["paused", "statusPaused"],
                      ["dropped", "statusDropped"],
                    ] as const
                  ).map(([status, key]) => (
                    <TabsTrigger
                      key={status}
                      value={status}
                      className="h-9 rounded-full px-3 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm sm:text-sm"
                    >
                      {t(key)} · {statusCounts[status]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>
          </section>

          <TabsContent
            value={activeTab}
            className="anime-library game-stage mt-0"
          >
            {visibleAnime.length === 0 ? (
              <section className="surface-panel flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 px-6 text-center">
                <div className="mb-4 rounded-2xl bg-primary/10 p-4 text-primary">
                  <Tv className="h-8 w-8" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">
                  {animeList.length === 0
                    ? t("noAnime")
                    : t("animeNoFilteredResults")}
                </h3>
                {animeList.length === 0 && (
                  <Button onClick={openAddDialog} className="mt-4 rounded-full">
                    <Plus aria-hidden="true" />
                    {t("addFirstAnime")}
                  </Button>
                )}
              </section>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleAnime.map((anime) => {
                  const progress = anime.totalEpisodes
                    ? Math.min(100, (anime.currentEpisode / anime.totalEpisodes) * 100)
                    : 0
                  return (
                    <Card
                      key={anime.id}
                      className="surface-card group overflow-hidden rounded-3xl border-border/70 bg-card/90 py-0 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <CardContent className="grid min-h-56 grid-cols-[104px_minmax(0,1fr)] gap-0 p-0 sm:grid-cols-[120px_minmax(0,1fr)]">
                        <div className="relative overflow-hidden bg-muted">
                          <AnimeCover
                            sourceUrl={anime.imageUrl}
                            title={anime.title}
                            type={anime.type}
                            className="h-full min-h-56 w-full transition duration-500 group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
                          <Badge
                            variant="outline"
                            className={cn(
                              "absolute bottom-2 left-2 max-w-[calc(100%-1rem)] rounded-full backdrop-blur",
                              STATUS_STYLES[anime.status],
                            )}
                          >
                            {statusIcon(anime.status)}
                            <span className="truncate">
                              {t(STATUS_TRANSLATION_KEYS[anime.status])}
                            </span>
                          </Badge>
                        </div>

                        <div className="flex min-w-0 flex-col p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 font-semibold leading-snug">
                                {anime.title}
                              </h3>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  {mediaIcon(anime.type, "h-3.5 w-3.5")}
                                  {t(TYPE_TRANSLATION_KEYS[anime.type])}
                                </span>
                                {anime.rating !== null && (
                                  <span className="inline-flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                                    {anime.rating}
                                  </span>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`${t("edit")} ${anime.title}`}
                                  className="-mr-1 -mt-1 rounded-full"
                                >
                                  <MoreHorizontal aria-hidden="true" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(anime)}>
                                  <Edit3 aria-hidden="true" />
                                  {t("edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteCandidate(anime)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 aria-hidden="true" />
                                  {t("delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="mt-4">
                            <div className="mb-1.5 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{t("progress")}</span>
                              <span className="font-medium">
                                {anime.currentEpisode} / {anime.totalEpisodes ?? "?"}
                              </span>
                            </div>
                            {anime.totalEpisodes ? (
                              <Progress value={progress} className="h-1.5" />
                            ) : (
                              <div className="h-1.5 rounded-full bg-muted" />
                            )}
                          </div>

                          <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/60 p-1.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-xl"
                              disabled={anime.currentEpisode === 0}
                              onClick={() => decrementEpisode(anime.id)}
                              aria-label={`${t("currentEpisode")} -1`}
                            >
                              <Minus aria-hidden="true" />
                            </Button>
                            <span className="text-sm font-semibold tabular-nums">
                              {t("episode")} {anime.currentEpisode}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-xl"
                              disabled={
                                anime.totalEpisodes !== null &&
                                anime.currentEpisode >= anime.totalEpisodes
                              }
                              onClick={() => incrementEpisode(anime.id)}
                              aria-label={`${t("currentEpisode")} +1`}
                            >
                              <Plus aria-hidden="true" />
                            </Button>
                          </div>

                          {anime.notes && (
                            <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {anime.notes}
                            </p>
                          )}
                          <p className="mt-auto flex items-center gap-1 pt-3 text-[11px] text-muted-foreground">
                            <CalendarDays className="h-3 w-3" aria-hidden="true" />
                            {new Date(anime.updatedAt).toLocaleDateString(locale)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent
          closeLabel={t("close")}
          className="max-h-[92vh] overflow-y-auto rounded-3xl p-0 sm:max-w-5xl"
        >
          <DialogHeader className="border-b px-5 py-5 text-left sm:px-7">
            <DialogTitle>
              {editingId ? t("editAnime") : t("addAnime")}
            </DialogTitle>
            <DialogDescription>
              {editingId ? t("editAnimeDescription") : t("addAnimeDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 px-5 py-5 sm:px-7 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="surface-panel rounded-3xl border border-border/70 bg-muted/25 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{t("animeLibrarySearch")}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {t("animeLibrarySearchHint")}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 rounded-full">
                  {isOnline ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
                  {isOnline ? t("animeSearchOnline") : t("animeSearchOffline")}
                </Badge>
              </div>

              <div className="mt-4 flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => updateSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        runSearchImmediately()
                      }
                    }}
                    placeholder={t("animeSearchPlaceholder")}
                    className="rounded-full bg-background pl-9"
                    role="searchbox"
                    aria-label={t("animeLibrarySearch")}
                    aria-controls="anime-search-results"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  className="rounded-full"
                  disabled={normalizeSearchQuery(searchQuery).length < 2}
                  onClick={runSearchImmediately}
                  aria-label={t("animeLibrarySearch")}
                >
                  {searchPhase === "loading" ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Search aria-hidden="true" />
                  )}
                </Button>
              </div>

              <div
                className="mt-3 min-h-8 text-xs text-muted-foreground"
                aria-live="polite"
                aria-atomic="true"
              >
                {showingCachedResults && (
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("animeCachedResults")}
                  </span>
                )}
                {!showingCachedResults && searchPhase === "loading" &&
                  t("animeSearchLoading")}
                {searchPhase === "success" && (
                  <span className={cn(showingCachedResults && "ml-2")}>
                    {t("animeSearchResultCount").replace(
                      "{count}",
                      String(searchResults.length),
                    )}
                  </span>
                )}
                {searchPhase === "idle" && t("animeSearchMinChars")}
                {searchPhase === "empty" && t("animeSearchEmpty")}
                {searchPhase === "offline" && t("animeOfflineSearchEmpty")}
                {searchPhase === "error" && t("animeSearchUnavailable")}
              </div>

              {(searchPhase === "offline" || searchPhase === "error") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mb-3 rounded-full"
                  onClick={runSearchImmediately}
                >
                  {t("animeRetrySearch")}
                </Button>
              )}

              <div
                id="anime-search-results"
                className="grid max-h-[420px] gap-2.5 overflow-y-auto pr-1"
                aria-label={t("animeLibrarySearch")}
                aria-busy={searchPhase === "loading"}
                role="list"
              >
                {searchResults.map((result) => (
                  <SearchResultItem
                    key={`${result.source}:${result.sourceId}`}
                    result={result}
                    query={searchQuery}
                    selectedCover={form.imageUrl}
                    onUseTitle={() => applySearchTitle(result)}
                    onUseCover={() => applySearchCover(result)}
                    t={t}
                  />
                ))}
              </div>
            </section>

            <section className="surface-panel rounded-3xl border border-border/70 bg-card p-4 sm:p-5">
              <h3 className="font-semibold">{t("animeManualDetails")}</h3>
              <div className="mt-4 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="anime-title">{t("animeTitle")} *</Label>
                  <Input
                    id="anime-title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder={t("animeTitlePlaceholder")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="anime-type">{t("animeType")}</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) =>
                        updateMediaType(value as AnimeMediaType)
                      }
                    >
                      <SelectTrigger id="anime-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anime">{t("typeAnime")}</SelectItem>
                        <SelectItem value="drama">{t("typeDrama")}</SelectItem>
                        <SelectItem value="movie">{t("typeMovie")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="anime-status">{t("animeStatus")}</Label>
                    <Select
                      value={form.status}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          status: value as AnimeStatus,
                        }))
                      }
                    >
                      <SelectTrigger id="anime-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="watching">{t("statusWatching")}</SelectItem>
                        <SelectItem value="completed">{t("statusCompleted")}</SelectItem>
                        <SelectItem value="planned">{t("statusPlanned")}</SelectItem>
                        <SelectItem value="paused">{t("statusPaused")}</SelectItem>
                        <SelectItem value="dropped">{t("statusDropped")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="anime-current-episode">{t("currentEpisode")}</Label>
                    <Input
                      id="anime-current-episode"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={form.currentEpisode}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          currentEpisode: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="anime-total-episodes">{t("totalEpisodes")}</Label>
                    <Input
                      id="anime-total-episodes"
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={form.totalEpisodes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          totalEpisodes: event.target.value,
                        }))
                      }
                      placeholder={t("ongoing")}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="anime-rating">{t("rating")} (0–10)</Label>
                  <Input
                    id="anime-rating"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    inputMode="decimal"
                    value={form.rating}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, rating: event.target.value }))
                    }
                    placeholder={t("ratingPlaceholder")}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="anime-cover">{t("coverImage")}</Label>
                  <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
                    <AnimeCover
                      sourceUrl={form.imageUrl}
                      title={form.title || t("coverImage")}
                      type={form.type}
                      className="h-24 w-[72px] rounded-xl border"
                    />
                    <Input
                      id="anime-cover"
                      value={form.imageUrl}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          imageUrl: event.target.value,
                        }))
                      }
                      placeholder="https://..."
                      className="self-center"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="anime-notes">{t("notes")}</Label>
                  <textarea
                    id="anime-notes"
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder={t("notesPlaceholder")}
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="border-t px-5 py-4 sm:px-7">
            <Button type="button" variant="outline" onClick={closeDialog}>
              {t("cancel")}
            </Button>
            <Button type="button" disabled={!form.title.trim()} onClick={saveAnime}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null)
        }}
      >
        <DialogContent closeLabel={t("close")} className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteAnimeTitle")}</DialogTitle>
            <DialogDescription>
              {deleteCandidate?.title}
              <br />
              {t("deleteAnimeDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCandidate(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteCandidate) {
                  setAnimeList((current) =>
                    current.filter((anime) => anime.id !== deleteCandidate.id),
                  )
                }
                setDeleteCandidate(null)
              }}
            >
              <Trash2 aria-hidden="true" />
              {t("confirmDeleteAnime")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
