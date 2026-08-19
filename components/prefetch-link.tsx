"use client"

import NextLink from "next/link"
import { forwardRef, useEffect, useState } from "react"
import type { ComponentProps } from "react"

type PrefetchLinkProps = ComponentProps<typeof NextLink>

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  function PrefetchLink({ prefetch, ...props }, ref) {
    // Start with prefetching disabled so an offline document does not enqueue
    // RSC requests before hydration has observed navigator.onLine.
    const [online, setOnline] = useState(false)

    useEffect(() => {
      const handleOnline = () => setOnline(true)
      const handleOffline = () => setOnline(false)

      setOnline(navigator.onLine)
      window.addEventListener("online", handleOnline)
      window.addEventListener("offline", handleOffline)
      return () => {
        window.removeEventListener("online", handleOnline)
        window.removeEventListener("offline", handleOffline)
      }
    }, [])

    return (
      <NextLink
        ref={ref}
        {...props}
        prefetch={online ? prefetch : false}
      />
    )
  },
)
