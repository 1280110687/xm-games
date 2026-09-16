"use client"

import { useState } from "react"
import { ArrowLeft, DoorOpen, Ellipsis, Gamepad2, Map, Palette, Globe } from "lucide-react"
import { CLUBHOUSE_ROOMS, CLUBHOUSE_ROOM_NAMES, type ClubhouseRoom, type ClubhousePlace } from "@xm-games/experience-bridge"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/features/themes/shared/theme-switcher"
import { useLocale } from "@/lib/locale-context"

const COPY = {
  zh: { menu: "会馆菜单", title: "游戏会馆", note: "随时调整，继续探索。", back: "返回走廊", room: "返回房间", entrance: "回到大门", directory: "游戏与工具目录", language: "语言", theme: "主题", rooms: "房间" },
  en: { menu: "Clubhouse menu", title: "Game clubhouse", note: "Make yourself at home.", back: "Back to corridor", room: "Back to room", entrance: "Return to entrance", directory: "Games and tools", language: "Language", theme: "Theme", rooms: "Rooms" },
  th: { menu: "เมนูคลับเกม", title: "คลับเกม", note: "ปรับแต่งแล้วสำรวจต่อ", back: "กลับไปทางเดิน", room: "กลับไปที่ห้อง", entrance: "กลับไปประตูหน้า", directory: "เกมและเครื่องมือ", language: "ภาษา", theme: "ธีม", rooms: "ห้อง" },
}

export function ThemeFourMenu({ place, onRoom, onBack, onEntrance, onDirectory, onOpenChange }: {
  place?: ClubhousePlace
  onRoom?: (id: ClubhouseRoom) => void
  onBack?: () => void
  onEntrance?: () => void
  onDirectory?: () => void
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const { locale } = useLocale()
  const router = useRouter()
  const copy = COPY[locale]
  const change = (next: boolean) => { setOpen(next); onOpenChange?.(next) }
  const act = (action: () => void) => { change(false); action() }
  return <Dialog open={open} onOpenChange={change}>
    <DialogTrigger asChild>
      <button type="button" className="theme-four-menu-trigger" aria-label={copy.menu}><Ellipsis aria-hidden="true" /></button>
    </DialogTrigger>
    <DialogContent className="theme-four-menu-dialog" closeLabel={locale === "zh" ? "关闭菜单" : locale === "th" ? "ปิดเมนู" : "Close menu"}>
      <DialogHeader><DialogTitle>{copy.title}</DialogTitle><DialogDescription>{copy.note}</DialogDescription></DialogHeader>
      <div className="theme-four-menu-preferences">
        <div><span><Globe aria-hidden="true" />{copy.language}</span><LanguageSwitcher /></div>
        <div><span><Palette aria-hidden="true" />{copy.theme}</span><ThemeSwitcher /></div>
      </div>
      <div className="theme-four-menu-actions">
        {place !== "entrance" && <button onClick={() => act(onBack ?? (() => router.push("/")))}><ArrowLeft aria-hidden="true" />{place ? copy.back : copy.room}</button>}
        {onRoom && <>
          <h3>{copy.rooms}</h3>
          {CLUBHOUSE_ROOMS.map((id) => <button key={id} onClick={() => act(() => onRoom(id))} aria-current={place === id ? "location" : undefined}><DoorOpen aria-hidden="true" />{CLUBHOUSE_ROOM_NAMES[locale][id]}</button>)}
        </>}
        {onEntrance && <button onClick={() => act(onEntrance)}><Gamepad2 aria-hidden="true" />{copy.entrance}</button>}
        {onDirectory && <button onClick={() => act(onDirectory)}><Map aria-hidden="true" />{copy.directory}</button>}
      </div>
    </DialogContent>
  </Dialog>
}
