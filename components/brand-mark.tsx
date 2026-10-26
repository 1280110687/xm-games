import Image from 'next/image'

import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('xm-brand-mark', className)} aria-hidden="true">
      <Image
        src="/images/brand/xm-controller-mark.png"
        width={256}
        height={119}
        alt=""
        loading="eager"
        draggable={false}
        unoptimized
      />
    </span>
  )
}
