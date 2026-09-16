"use client"

import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { PrefetchLink as Link } from "@/components/prefetch-link"
import { useLocale } from "@/lib/locale-context"
import { ThemeFourMenu } from "./menu"

export function ThemeFourPageHeader({ title, description, actions }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  const { locale } = useLocale()
  const back = ({ zh: "返回房间", en: "Back to room", th: "กลับไปที่ห้อง" })[locale]
  return <header className="theme-four-page-header">
    <Link href="/" aria-label={back} className="theme-four-page-back"><ArrowLeft aria-hidden="true" /></Link>
    <div className="theme-four-page-heading">{title && <h1>{title}</h1>}{description && <p>{description}</p>}</div>
    <div className="theme-four-page-actions">{actions}<ThemeFourMenu /></div>
  </header>
}
