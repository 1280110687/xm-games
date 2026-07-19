"use client"

import { useLocale } from "@/lib/locale-context"
import { Locale, locales, localeNames } from "@/lib/i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Globe } from "lucide-react"

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
      <SelectTrigger
        aria-label={localeNames[locale]}
        className="w-[122px] border-white/10 bg-white/[0.045] text-foreground shadow-none max-[360px]:w-10 max-[360px]:justify-center max-[360px]:gap-0 max-[360px]:px-0 max-[360px]:[&>[data-slot=select-value]]:hidden max-[360px]:[&>svg:last-child]:hidden"
      >
        <Globe className="mr-1 h-4 w-4 text-violet-300" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
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
