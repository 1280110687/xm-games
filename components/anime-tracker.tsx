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
import { LanguageSwitcher } from "@/components/language-switcher"
import Link from "next/link"
import { 
  ArrowLeft, 
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
  Calendar
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

const STORAGE_KEY = "xm-games-anime-tracker"

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

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setAnimeList(JSON.parse(saved))
      } catch {
        console.error("Failed to parse saved anime list")
      }
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(animeList))
  }, [animeList])

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{t("animeTracker")}</h1>
              <p className="text-sm text-slate-400">{t("animeTrackerDescription")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("addAnime")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-700 bg-slate-800 text-white sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingAnime ? t("editAnime") : t("addAnime")}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    {editingAnime ? t("editAnimeDescription") : t("addAnimeDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">{t("animeTitle")} *</Label>
                    <Input
                      id="title"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder={t("animeTitlePlaceholder")}
                      className="border-slate-600 bg-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
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
                    <Input
                      id="imageUrl"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="border-slate-600 bg-slate-700"
                    />
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
                <DialogFooter>
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
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnimeStatus | "all")} className="w-full">
          <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger 
              value="all" 
              className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 data-[state=active]:border-white data-[state=active]:bg-white data-[state=active]:text-slate-900"
            >
              {t("all")} ({statusCounts.all})
            </TabsTrigger>
            <TabsTrigger 
              value="watching" 
              className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Play className="mr-1 h-3 w-3" />
              {t("statusWatching")} ({statusCounts.watching})
            </TabsTrigger>
            <TabsTrigger 
              value="planned" 
              className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 data-[state=active]:border-yellow-500 data-[state=active]:bg-yellow-500 data-[state=active]:text-white"
            >
              <Clock className="mr-1 h-3 w-3" />
              {t("statusPlanned")} ({statusCounts.planned})
            </TabsTrigger>
            <TabsTrigger 
              value="completed" 
              className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 data-[state=active]:border-green-500 data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {t("statusCompleted")} ({statusCounts.completed})
            </TabsTrigger>
            <TabsTrigger 
              value="paused" 
              className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              <Pause className="mr-1 h-3 w-3" />
              {t("statusPaused")} ({statusCounts.paused})
            </TabsTrigger>
            <TabsTrigger 
              value="dropped" 
              className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 data-[state=active]:border-red-500 data-[state=active]:bg-red-500 data-[state=active]:text-white"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              {t("statusDropped")} ({statusCounts.dropped})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {sortedList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Tv className="mb-4 h-16 w-16 opacity-50" />
                <p className="mb-4 text-lg">{t("noAnime")}</p>
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("addFirstAnime")}
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedList.map((anime) => (
                  <Card 
                    key={anime.id} 
                    className="overflow-hidden border-slate-700 bg-slate-800/50 transition-all hover:border-slate-500"
                  >
                    <div className="relative">
                      {anime.imageUrl ? (
                        <div 
                          className="h-40 bg-cover bg-center" 
                          style={{ backgroundImage: `url(${anime.imageUrl})` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-800 to-transparent" />
                        </div>
                      ) : (
                        <div className="flex h-40 items-center justify-center bg-slate-700">
                          {getTypeIcon(anime.type)}
                        </div>
                      )}
                      <div className="absolute right-2 top-2 flex gap-1">
                        <Badge className={`${getStatusColor(anime.status)} text-white`}>
                          {getStatusIcon(anime.status)}
                          <span className="ml-1">{t(`status${anime.status.charAt(0).toUpperCase() + anime.status.slice(1)}` as keyof typeof translations.zh)}</span>
                        </Badge>
                      </div>
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="line-clamp-2 text-lg text-white">
                          {anime.title}
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
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
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        {getTypeIcon(anime.type)}
                        <span>{t(`type${anime.type.charAt(0).toUpperCase() + anime.type.slice(1)}` as keyof typeof translations.zh)}</span>
                        {anime.rating && (
                          <>
                            <Star className="ml-2 h-4 w-4 fill-yellow-500 text-yellow-500" />
                            <span>{anime.rating}</span>
                          </>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent>
                      {/* Episode Progress */}
                      <div className="mb-3">
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-slate-400">{t("progress")}</span>
                          <span className="text-white">
                            {anime.currentEpisode} / {anime.totalEpisodes || "?"}
                          </span>
                        </div>
                        {anime.totalEpisodes && (
                          <Progress 
                            value={(anime.currentEpisode / anime.totalEpisodes) * 100} 
                            className="h-2 bg-slate-700"
                          />
                        )}
                      </div>

                      {/* Episode Controls */}
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => decrementEpisode(anime.id)}
                          disabled={anime.currentEpisode === 0}
                          className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-lg font-bold text-white">
                          {t("episode")} {anime.currentEpisode}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => incrementEpisode(anime.id)}
                          disabled={anime.totalEpisodes !== null && anime.currentEpisode >= anime.totalEpisodes}
                          className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {anime.notes && (
                        <p className="mt-3 line-clamp-2 text-sm text-slate-400">
                          {anime.notes}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="h-3 w-3" />
                        {new Date(anime.updatedAt).toLocaleDateString()}
                      </div>
                    </CardContent>
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

// Add translations type
type translations = typeof import("@/lib/i18n").translations
