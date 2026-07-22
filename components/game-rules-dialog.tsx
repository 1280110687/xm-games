"use client"

import type { ReactNode } from "react"
import { HelpCircle, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface GameRulesDialogProps {
  triggerLabel: string
  title?: ReactNode
  closeLabel: string
  children: ReactNode
  triggerClassName?: string
  triggerIconClassName?: string
  contentClassName?: string
  titleClassName?: string
  closeButtonClassName?: string
  onOpenChange?: (open: boolean) => void
}

export function GameRulesDialog({
  triggerLabel,
  title = triggerLabel,
  closeLabel,
  children,
  triggerClassName,
  triggerIconClassName,
  contentClassName,
  titleClassName,
  closeButtonClassName,
  onOpenChange,
}: GameRulesDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("border-white/10 bg-white/[0.04] text-foreground hover:bg-white/[0.08]", triggerClassName)}>
          <HelpCircle
            className={cn("h-4 w-4", triggerIconClassName)}
            aria-hidden="true"
          />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[82vh] overflow-y-auto border-white/10 bg-popover p-5 text-foreground sm:max-w-md sm:p-6",
          contentClassName,
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={closeLabel}
              className={closeButtonClassName}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          {triggerLabel}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}
