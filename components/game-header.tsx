"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, Home } from "lucide-react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type HeaderLayout = "simple" | "centered" | "tool" | "hero"
type HomeLabelMode = "always" | "desktop" | "sr-only"

interface GameHeaderProps {
  homeLabel: string
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  layout?: HeaderLayout
  homeIcon?: "home" | "back"
  homeLabelMode?: HomeLabelMode
  className?: string
  homeButtonClassName?: string
  titleClassName?: string
  descriptionClassName?: string
}

function HomeLink({
  label,
  icon,
  labelMode,
  className,
}: {
  label: string
  icon: "home" | "back"
  labelMode: HomeLabelMode
  className?: string
}) {
  const Icon = icon === "back" ? ArrowLeft : Home

  return (
    <Button
      asChild
      variant="ghost"
      size={labelMode === "sr-only" ? "icon" : "sm"}
      className={className}
    >
      <Link href="/">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span
          className={cn(
            labelMode === "desktop" && "hidden sm:inline",
            labelMode === "sr-only" && "sr-only",
          )}
        >
          {label}
        </span>
      </Link>
    </Button>
  )
}

export function GameHeader({
  homeLabel,
  title,
  description,
  actions,
  layout = "simple",
  homeIcon = "home",
  homeLabelMode = "always",
  className,
  homeButtonClassName,
  titleClassName,
  descriptionClassName,
}: GameHeaderProps) {
  const home = (
    <HomeLink
      label={homeLabel}
      icon={homeIcon}
      labelMode={homeLabelMode}
      className={homeButtonClassName}
    />
  )
  const languageAndActions = (
    <div className="flex items-center gap-1 sm:gap-2">
      <LanguageSwitcher />
      {actions}
    </div>
  )

  if (layout === "hero") {
    return (
      <header className={cn("mb-8", className)}>
        <div className="mb-4 flex items-center justify-between">
          {home}
          {languageAndActions}
        </div>
        <div className="flex flex-col items-center gap-4 text-center">
          {title && <h1 className={titleClassName}>{title}</h1>}
          {description && <p className={descriptionClassName}>{description}</p>}
        </div>
      </header>
    )
  }

  if (layout === "tool") {
    return (
      <header className={cn("flex items-center justify-between gap-2", className)}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {home}
          <div className="min-w-0">
            {title && <h1 className={titleClassName}>{title}</h1>}
            {description && <p className={descriptionClassName}>{description}</p>}
          </div>
        </div>
        {languageAndActions}
      </header>
    )
  }

  if (layout === "centered") {
    return (
      <header
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2",
          className,
        )}
      >
        <div className="justify-self-start">{home}</div>
        {title && <h1 className={titleClassName}>{title}</h1>}
        <div className="justify-self-end">{languageAndActions}</div>
      </header>
    )
  }

  return (
    <header className={cn("flex items-center justify-between", className)}>
      {home}
      {languageAndActions}
    </header>
  )
}
