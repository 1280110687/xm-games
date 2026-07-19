"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/lib/locale-context"
import type { TranslationKey } from "@/lib/i18n"
import { GameHeader } from "@/components/game-header"
import { 
  Plus, 
  Minus, 
  Play, 
  CheckCircle2, 
  Clock, 
  Pause, 
  Trash2, 
  Edit, 
  MoreVertical,
  Tv,
  Film,
  Star,
  Calendar,
  Search,
  Loader2,
  ImageIcon
} from "lucide-react"

// Types
type AnimeStatus = "watching" | "completed" | "planned" | "paused" | "dropped"

interface Anime {
  id: string
  title: string
  totalEpisodes: number | null // null for ongoing series
  currentEpisode: number
  status: AnimeStatus
  type: "anime" | "drama" | "movie"
  rating: number | null
  notes: string
  imageUrl: string
  addedAt: number
  updatedAt: number
}

const STATUS_TRANSLATION_KEYS: Record<AnimeStatus, TranslationKey> = {
  watching: "statusWatching",
  completed: "statusCompleted",
  planned: "statusPlanned",
  paused: "statusPaused",
  dropped: "statusDropped",
}

const TYPE_TRANSLATION_KEYS: Record<Anime["type"], TranslationKey> = {
  anime: "typeAnime",
  drama: "typeDrama",
  movie: "typeMovie",
}

interface JikanAnime {
  mal_id: number
  title: string
  images: {
    jpg: {
      image_url: string
      large_image_url: string
    }
  }
  episodes: number | null
  score: number | null
}

const STORAGE_KEY = "xm-games-anime-tracker"
const IMAGE_CACHE_KEY = "xm-games-anime-images"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isAnime(value: unknown): value is Anime {
  if (!isRecord(value)) return false

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (value.totalEpisodes === null || typeof value.totalEpisodes === "number") &&
    typeof value.currentEpisode === "number" &&
    ["watching", "completed", "planned", "paused", "dropped"].includes(
      String(value.status)
    ) &&
    ["anime", "drama", "movie"].includes(String(value.type)) &&
    (value.rating === null || typeof value.rating === "number") &&
    typeof value.notes === "string" &&
    typeof value.imageUrl === "string" &&
    typeof value.addedAt === "number" &&
    typeof value.updatedAt === "number"
  )
}

function isAnimeList(value: unknown): value is Anime[] {
  return Array.isArray(value) && value.every(isAnime)
}

function isImageCache(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every(item => typeof item === "string")
}

function parseStoredValue<T>(
  rawValue: string | null,
  fallback: T,
  isValid: (value: unknown) => value is T,
  label: string
): T {
  if (rawValue === null) return fallback

  try {
    const parsed: unknown = JSON.parse(rawValue)
    if (isValid(parsed)) return parsed
  } catch {
    // Invalid JSON falls through to the safe default below.
  }

  console.error(`Failed to parse ${label}`)
  return fallback
}

export function AnimeTracker() {
  const { t } = useLocale()
  const [animeList, setAnimeList] = useState<Anime[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingAnime, setEditingAnime] = useState<Anime | null>(null)
  const [activeTab, setActiveTab] = useState<AnimeStatus | "all">("watching")

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formTotalEpisodes, setFormTotalEpisodes] = useState("")
  const [formCurrentEpisode, setFormCurrentEpisode] = useState("0")
  const [formStatus, setFormStatus] = useState<AnimeStatus>("watching")
  const [formType, setFormType] = useState<"anime" | "drama" | "movie">("anime")
  const [formRating, setFormRating] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formImageUrl, setFormImageUrl] = useState("")

  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<JikanAnime[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [imageCache, setImageCache] = useState<Record<string, string>>({})
  const [isStorageReady, setIsStorageReady] = useState(false)

  // Load both persisted values before enabling writes. The ready guard is
  // important in development too, where Strict Mode replays effects.
  useEffect(() => {
    try {
      const savedAnimeList = parseStoredValue(
        localStorage.getItem(STORAGE_KEY),
        [],
        isAnimeList,
        "saved anime list"
      )
      const savedImageCache = parseStoredValue(
        localStorage.getItem(IMAGE_CACHE_KEY),
        {},
        isImageCache,
        "image cache"
      )

      setAnimeList(savedAnimeList)
      setImageCache(savedImageCache)
    } catch {
      console.error("Failed to read anime tracker storage")
    } finally {
      setIsStorageReady(true)
    }
  }, [])

  // Persist only after the initial read has completed. This prevents the
  // component's empty initial state from replacing existing user data.
  useEffect(() => {
    if (!isStorageReady) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(animeList))
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(imageCache))
    } catch {
      console.error("Failed to save anime tracker storage")
    }
  }, [animeList, imageCache, isStorageReady])

  // Search anime using Jikan API (MyAnimeList)
  const searchAnime = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    // Check cache first
    const cacheKey = query.toLowerCase().trim()
    if (imageCache[cacheKey]) {
      setFormImageUrl(imageCache[cacheKey])
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=5`
      )
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.data || [])
        setShowSearchResults(true)
      }
    } catch (error) {
      console.error("Failed to search anime:", error)
    } finally {
      setIsSearching(false)
    }
  }, [imageCache])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formTitle && formType === "anime" && !editingAnime) {
        searchAnime(formTitle)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [formTitle, formType, editingAnime, searchAnime])

  const selectSearchResult = (anime: JikanAnime) => {
    setFormTitle(anime.title)
    if (anime.images?.jpg?.large_image_url) {
      setFormImageUrl(anime.images.jpg.large_image_url)
      // Cache the image URL
      setImageCache(prev => ({
        ...prev,
        [anime.title.toLowerCase()]: anime.images.jpg.large_image_url
      }))
    }
    if (anime.episodes) {
      setFormTotalEpisodes(anime.episodes.toString())
    }
    if (anime.score) {
      setFormRating(anime.score.toString())
    }
    setShowSearchResults(false)
  }

  const resetForm = useCallback(() => {
    setFormTitle("")
    setFormTotalEpisodes("")
    setFormCurrentEpisode("0")
    setFormStatus("watching")
    setFormType("anime")
    setFormRating("")
    setFormNotes("")
    setFormImageUrl("")
    setEditingAnime(null)
    setSearchResults([])
    setShowSearchResults(false)
  }, [])

  const openEditDialog = (anime: Anime) => {
    setEditingAnime(anime)
    setFormTitle(anime.title)
    setFormTotalEpisodes(anime.totalEpisodes?.toString() || "")
    setFormCurrentEpisode(anime.currentEpisode.toString())
    setFormStatus(anime.status)
    setFormType(anime.type)
    setFormRating(anime.rating?.toString() || "")
    setFormNotes(anime.notes)
    setFormImageUrl(anime.imageUrl)
    setIsAddDialogOpen(true)
  }

  const handleSave = () => {
    if (!formTitle.trim()) return

    const now = Date.now()
    const totalEps = formTotalEpisodes ? parseInt(formTotalEpisodes) : null
    const currentEp = parseInt(formCurrentEpisode) || 0

    if (editingAnime) {
      // Update existing
      setAnimeList(list => list.map(a => 
        a.id === editingAnime.id 
          ? {
              ...a,
              title: formTitle.trim(),
              totalEpisodes: totalEps,
              currentEpisode: currentEp,
              status: formStatus,
              type: formType,
              rating: formRating ? parseFloat(formRating) : null,
              notes: formNotes,
              imageUrl: formImageUrl,
              updatedAt: now,
            }
          : a
      ))
    } else {
      // Add new
      const newAnime: Anime = {
        id: crypto.randomUUID(),
        title: formTitle.trim(),
        totalEpisodes: totalEps,
        currentEpisode: currentEp,
        status: formStatus,
        type: formType,
        rating: formRating ? parseFloat(formRating) : null,
        notes: formNotes,
        imageUrl: formImageUrl,
        addedAt: now,
        updatedAt: now,
      }
      setAnimeList(list => [newAnime, ...list])
    }

    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setAnimeList(list => list.filter(a => a.id !== id))
  }

  const incrementEpisode = (id: string) => {
    setAnimeList(list => list.map(a => {
      if (a.id !== id) return a
      const newEp = a.currentEpisode + 1
      const isCompleted = a.totalEpisodes && newEp >= a.totalEpisodes
      return {
        ...a,
        currentEpisode: newEp,
        status: isCompleted ? "completed" : a.status,
        updatedAt: Date.now(),
      }
    }))
  }

  const decrementEpisode = (id: string) => {
    setAnimeList(list => list.map(a => {
      if (a.id !== id) return a
      const newEp = Math.max(0, a.currentEpisode - 1)
      return {
        ...a,
        currentEpisode: newEp,
        status: a.status === "completed" && a.totalEpisodes && newEp < a.totalEpisodes ? "watching" : a.status,
        updatedAt: Date.now(),
      }
    }))
  }

  const getStatusColor = (status: AnimeStatus) => {
    switch (status) {
      case "watching": return "bg-blue-500"
      case "completed": return "bg-green-500"
      case "planned": return "bg-yellow-500"
      case "paused": return "bg-orange-500"
      case "dropped": return "bg-red-500"
    }
  }

  const getStatusIcon = (status: AnimeStatus) => {
    switch (status) {
      case "watching": return <Play className="h-3 w-3" />
      case "completed": return <CheckCircle2 className="h-3 w-3" />
      case "planned": return <Clock className="h-3 w-3" />
      case "paused": return <Pause className="h-3 w-3" />
      case "dropped": return <Trash2 className="h-3 w-3" />
    }
  }

  const getTypeIcon = (type: "anime" | "drama" | "movie") => {
    switch (type) {
      case "anime": return <Tv className="h-4 w-4" />
      case "drama": return <Film className="h-4 w-4" />
      case "movie": return <Film className="h-4 w-4" />
    }
  }

  const filteredList = activeTab === "all" 
    ? animeList 
    : animeList.filter(a => a.status === activeTab)

  const sortedList = [...filteredList].sort((a, b) => b.updatedAt - a.updatedAt)

  const statusCounts = {
    all: animeList.length,
    watching: animeList.filter(a => a.status === "watching").length,
    completed: animeList.filter(a => a.status === "completed").length,
    planned: animeList.filter(a => a.status === "planned").length,
    paused: animeList.filter(a => a.status === "paused").length,
    dropped: animeList.filter(a => a.status === "dropped").length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4">
      <div className="mx-auto max-w-6xl">
        <GameHeader
          layout="tool"
          homeIcon="back"
          homeLabel={t("appName")}
          homeLabelMode="sr-only"
          title={t("animeTracker")}
          description={t("animeTrackerDescription")}
          className="mb-4 sm:mb-6"
          homeButtonClassName="h-8 w-8 text-slate-400 hover:text-white sm:h-10 sm:w-10"
          titleClassName="text-lg font-bold text-white sm:text-2xl"
          descriptionClassName="hidden text-sm text-slate-400 sm:block"
          actions={
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open)
                if (!open) resetForm()
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1 px-2 sm:gap-2 sm:px-4">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("addAnime")}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] w-[95vw] max-w-md overflow-y-auto border-slate-700 bg-slate-800 text-white">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAnime ? t("editAnime") : t("addAnime")}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                      {editingAnime ? t("editAnimeDescription") : t("addAnimeDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
{/* Title with Search */}
                                    <div className="relative grid gap-2">
                                      <Label htmlFor="title">{t("animeTitle")} *</Label>
                                      <div className="relative">
                                        <Input
                                          id="title"
                                          value={formTitle}
                                          onChange={(e) => {
                                            setFormTitle(e.target.value)
                                            if (e.target.value.length >= 2 && formType === "anime") {
                                              setShowSearchResults(true)
                                            }
                                          }}
                                          onFocus={() => {
                                            if (searchResults.length > 0 && formType === "anime") {
                                              setShowSearchResults(true)
                                            }
                                          }}
                                          onBlur={() => {
                                            // Delay hiding to allow click on results
                                            setTimeout(() => setShowSearchResults(false), 200)
                                          }}
                                          placeholder={t("animeTitlePlaceholder")}
                                          className="border-slate-600 bg-slate-700 pr-10"
                                        />
                                        {isSearching && (
                                          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                                        )}
                                        {!isSearching && formType === "anime" && (
                                          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        )}
                                      </div>
                                      {/* Search Results Dropdown */}
                                      {showSearchResults && searchResults.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-600 bg-slate-700 shadow-lg">
                                          {searchResults.map((anime) => (
                                            <button
                                              key={anime.mal_id}
                                              type="button"
                                              onMouseDown={(e) => {
                                                e.preventDefault()
                                                selectSearchResult(anime)
                                              }}
                                              className="flex w-full items-center gap-3 p-2 text-left hover:bg-slate-600"
                                            >
                                              {anime.images?.jpg?.image_url ? (
                                                // Search results are short-lived third-party URLs from Jikan.
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img 
                                                  src={anime.images.jpg.image_url} 
                                                  alt={anime.title}
                                                  className="h-12 w-9 rounded object-cover"
                                                />
                                              ) : (
                                                <div className="flex h-12 w-9 items-center justify-center rounded bg-slate-600">
                                                  <ImageIcon className="h-4 w-4 text-slate-400" />
                                                </div>
                                              )}
                                              <div className="flex-1 overflow-hidden">
                                                <p className="truncate text-sm font-medium text-white">{anime.title}</p>
                                                <p className="text-xs text-slate-400">
                                                  {anime.episodes ? `${anime.episodes} ${t("episodesUnit")}` : t("ongoing")}
                                                  {anime.score && ` · ${anime.score}`}
                                                </p>
                                              </div>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="type">{t("animeType")}</Label>
                        <Select value={formType} onValueChange={(v) => setFormType(v as "anime" | "drama" | "movie")}>
                          <SelectTrigger className="border-slate-600 bg-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-slate-600 bg-slate-700">
                            <SelectItem value="anime">{t("typeAnime")}</SelectItem>
                            <SelectItem value="drama">{t("typeDrama")}</SelectItem>
                            <SelectItem value="movie">{t("typeMovie")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="status">{t("animeStatus")}</Label>
                        <Select value={formStatus} onValueChange={(v) => setFormStatus(v as AnimeStatus)}>
                          <SelectTrigger className="border-slate-600 bg-slate-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-slate-600 bg-slate-700">
                            <SelectItem value="watching">{t("statusWatching")}</SelectItem>
                            <SelectItem value="completed">{t("statusCompleted")}</SelectItem>
                            <SelectItem value="planned">{t("statusPlanned")}</SelectItem>
                            <SelectItem value="paused">{t("statusPaused")}</SelectItem>
                            <SelectItem value="dropped">{t("statusDropped")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="currentEp">{t("currentEpisode")}</Label>
                        <Input
                          id="currentEp"
                          type="number"
                          min="0"
                          value={formCurrentEpisode}
                          onChange={(e) => setFormCurrentEpisode(e.target.value)}
                          className="border-slate-600 bg-slate-700"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="totalEp">{t("totalEpisodes")}</Label>
                        <Input
                          id="totalEp"
                          type="number"
                          min="1"
                          value={formTotalEpisodes}
                          onChange={(e) => setFormTotalEpisodes(e.target.value)}
                          placeholder={t("ongoing")}
                          className="border-slate-600 bg-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="rating">{t("rating")} (0-10)</Label>
                      <Input
                        id="rating"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formRating}
                        onChange={(e) => setFormRating(e.target.value)}
                        placeholder={t("ratingPlaceholder")}
                        className="border-slate-600 bg-slate-700"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="imageUrl">{t("coverImage")}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="imageUrl"
                          value={formImageUrl}
                          onChange={(e) => setFormImageUrl(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 border-slate-600 bg-slate-700"
                        />
                        {formImageUrl && (
                          <div className="h-10 w-8 overflow-hidden rounded border border-slate-600">
                            {/* User-entered URLs can use any host, so they cannot use a fixed Next Image allowlist. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={formImageUrl} 
                              alt="Preview" 
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {formType === "anime" && (
                        <p className="text-xs text-slate-500">{t("autoSearchHint")}</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="notes">{t("notes")}</Label>
                      <Input
                        id="notes"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder={t("notesPlaceholder")}
                        className="border-slate-600 bg-slate-700"
                      />
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                      <Button variant="outline" className="border-slate-600">
                        {t("cancel")}
                      </Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={!formTitle.trim()}>
                      {t("save")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          }
        />

        {/* Tabs - Mobile Optimized with horizontal scroll */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnimeStatus | "all")} className="w-full">
          <div className="-mx-2 mb-4 overflow-x-auto px-2 sm:mx-0 sm:mb-6 sm:px-0">
            <TabsList className="inline-flex h-auto min-w-max gap-1.5 bg-transparent p-0 sm:flex-wrap sm:gap-2">
              <TabsTrigger 
                value="all" 
                className="whitespace-nowrap rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs data-[state=active]:border-white data-[state=active]:bg-white data-[state=active]:text-slate-900 sm:px-4 sm:py-2 sm:text-sm"
              >
                {t("all")} ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger 
                value="watching" 
                className="whitespace-nowrap rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs data-[state=active]:border-blue-500 data-[state=active]:bg-blue-500 data-[state=active]:text-white sm:px-4 sm:py-2 sm:text-sm"
              >
                <Play className="mr-1 h-3 w-3" />
                {t("statusWatching")} ({statusCounts.watching})
              </TabsTrigger>
              <TabsTrigger 
                value="planned" 
                className="whitespace-nowrap rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs data-[state=active]:border-yellow-500 data-[state=active]:bg-yellow-500 data-[state=active]:text-white sm:px-4 sm:py-2 sm:text-sm"
              >
                <Clock className="mr-1 h-3 w-3" />
                {t("statusPlanned")} ({statusCounts.planned})
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="whitespace-nowrap rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs data-[state=active]:border-green-500 data-[state=active]:bg-green-500 data-[state=active]:text-white sm:px-4 sm:py-2 sm:text-sm"
              >
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t("statusCompleted")} ({statusCounts.completed})
              </TabsTrigger>
              <TabsTrigger 
                value="paused" 
                className="whitespace-nowrap rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-white sm:px-4 sm:py-2 sm:text-sm"
              >
                <Pause className="mr-1 h-3 w-3" />
                {t("statusPaused")} ({statusCounts.paused})
              </TabsTrigger>
              <TabsTrigger 
                value="dropped" 
                className="whitespace-nowrap rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs data-[state=active]:border-red-500 data-[state=active]:bg-red-500 data-[state=active]:text-white sm:px-4 sm:py-2 sm:text-sm"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                {t("statusDropped")} ({statusCounts.dropped})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {sortedList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 sm:py-16">
                <Tv className="mb-4 h-12 w-12 opacity-50 sm:h-16 sm:w-16" />
                <p className="mb-4 text-base sm:text-lg">{t("noAnime")}</p>
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("addFirstAnime")}
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {sortedList.map((anime) => (
                  <Card 
                    key={anime.id} 
                    className="overflow-hidden border-slate-700 bg-slate-800/50 transition-all hover:border-slate-500"
                  >
                    {/* Card with horizontal layout on mobile */}
                    <div className="flex sm:block">
                      {/* Image - smaller on mobile, side by side */}
                      <div className="relative w-24 flex-shrink-0 sm:w-full">
                        {anime.imageUrl ? (
                          <div 
                            className="h-full min-h-[120px] bg-cover bg-center sm:h-40" 
                            style={{ backgroundImage: `url(${anime.imageUrl})` }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-800 sm:bg-gradient-to-t sm:from-slate-800 sm:to-transparent" />
                          </div>
                        ) : (
                          <div className="flex h-full min-h-[120px] items-center justify-center bg-slate-700 sm:h-40">
                            {getTypeIcon(anime.type)}
                          </div>
                        )}
                        {/* Status badge - desktop only on image */}
                        <div className="absolute right-1 top-1 hidden sm:right-2 sm:top-2 sm:flex">
                          <Badge className={`${getStatusColor(anime.status)} text-xs text-white`}>
                            {getStatusIcon(anime.status)}
                            <span className="ml-1">{t(STATUS_TRANSLATION_KEYS[anime.status])}</span>
                          </Badge>
                        </div>
                      </div>

                      {/* Content area */}
                      <div className="flex flex-1 flex-col p-3 sm:p-0">
                        <CardHeader className="p-0 pb-2 sm:p-4 sm:pb-2">
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="line-clamp-2 text-sm font-bold text-white sm:text-lg">
                                {anime.title}
                              </CardTitle>
                              {/* Mobile status badge */}
                              <div className="mt-1 sm:hidden">
                                <Badge className={`${getStatusColor(anime.status)} text-xs text-white`}>
                                  {getStatusIcon(anime.status)}
                                  <span className="ml-1">{t(STATUS_TRANSLATION_KEYS[anime.status])}</span>
                                </Badge>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-slate-400 sm:h-8 sm:w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="border-slate-600 bg-slate-700">
                                <DropdownMenuItem onClick={() => openEditDialog(anime)} className="text-white">
                                  <Edit className="mr-2 h-4 w-4" />
                                  {t("edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(anime.id)} 
                                  className="text-red-400 focus:text-red-400"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400 sm:gap-2 sm:text-sm">
                            {getTypeIcon(anime.type)}
                            <span>{t(TYPE_TRANSLATION_KEYS[anime.type])}</span>
                            {anime.rating && (
                              <>
                                <Star className="ml-1 h-3 w-3 fill-yellow-500 text-yellow-500 sm:ml-2 sm:h-4 sm:w-4" />
                                <span>{anime.rating}</span>
                              </>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="flex-1 p-0 sm:p-4 sm:pt-0">
                          {/* Episode Progress */}
                          <div className="mb-2 sm:mb-3">
                            <div className="mb-1 flex items-center justify-between text-xs sm:text-sm">
                              <span className="text-slate-400">{t("progress")}</span>
                              <span className="text-white">
                                {anime.currentEpisode} / {anime.totalEpisodes || "?"}
                              </span>
                            </div>
                            {anime.totalEpisodes && (
                              <Progress 
                                value={(anime.currentEpisode / anime.totalEpisodes) * 100} 
                                className="h-1.5 bg-slate-700 sm:h-2"
                              />
                            )}
                          </div>

                          {/* Episode Controls */}
                          <div className="flex items-center justify-between gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => decrementEpisode(anime.id)}
                              disabled={anime.currentEpisode === 0}
                              className="h-7 w-7 border-slate-600 bg-slate-700 p-0 text-white hover:bg-slate-600 sm:h-8 sm:w-8"
                            >
                              <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <span className="text-sm font-bold text-white sm:text-lg">
                              {t("episode")} {anime.currentEpisode}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => incrementEpisode(anime.id)}
                              disabled={anime.totalEpisodes !== null && anime.currentEpisode >= anime.totalEpisodes}
                              className="h-7 w-7 border-slate-600 bg-slate-700 p-0 text-white hover:bg-slate-600 sm:h-8 sm:w-8"
                            >
                              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>

                          {anime.notes && (
                            <p className="mt-2 line-clamp-2 text-xs text-slate-400 sm:mt-3 sm:text-sm">
                              {anime.notes}
                            </p>
                          )}

                          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 sm:mt-3">
                            <Calendar className="h-3 w-3" />
                            {new Date(anime.updatedAt).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
