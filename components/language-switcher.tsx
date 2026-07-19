"use client"

import { useLocale } from "@/lib/locale-context"
import { Locale, locales, localeNames } from "@/lib/i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Globe } from "lucide-react"

const localeCompactNames: Record<Locale, string> = {
  zh: "中",
  en: "EN",
  th: "ไทย",
}

const localeMobileNames: Record<Locale, string> = {
  zh: "中文",
  en: "EN",
  th: "ไทย",
}

const localeSelectorLabels: Record<Locale, string> = {
  zh: "选择语言，当前为中文",
  en: "Select language, currently English",
  th: "เลือกภาษา ภาษาปัจจุบันคือไทย",
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
      <SelectTrigger
        aria-label={localeSelectorLabels[locale]}
        className="!w-[84px] gap-1.5 rounded-full border-white/10 bg-white/[0.055] !px-2 font-semibold text-foreground shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)] hover:border-violet-300/25 hover:bg-white/[0.085] data-[state=open]:border-violet-300/35 data-[state=open]:bg-violet-400/10 min-[360px]:!w-[96px] sm:!w-[126px] sm:gap-2 sm:!px-3"
      >
        <Globe className="size-4 text-violet-300" aria-hidden="true" />
        <span className="text-xs tracking-wide min-[360px]:hidden" aria-hidden="true">
          {localeCompactNames[locale]}
        </span>
        <span className="hidden text-sm min-[360px]:inline sm:hidden" aria-hidden="true">
          {localeMobileNames[locale]}
        </span>
        <span className="hidden text-sm sm:inline" aria-hidden="true">
          {localeNames[locale]}
        </span>
      </SelectTrigger>
      <SelectContent align="end" sideOffset={6}>
        {locales.map((loc) => (
          <SelectItem
            key={loc}
            value={loc}
            className="text-foreground"
          >
            {localeNames[loc]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
