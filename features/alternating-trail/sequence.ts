import type { SchulteCellCount } from "@/features/schulte-grid/engine"

export type AlternatingTrailTargetKind = "number" | "letter"

export interface AlternatingTrailTarget {
  ordinal: number
  kind: AlternatingTrailTargetKind
  label: string
}

export const ALTERNATING_TRAIL_MAX_TARGETS = 49

export function getAlternatingTrailTarget(
  ordinal: number,
): AlternatingTrailTarget {
  if (
    !Number.isInteger(ordinal)
    || ordinal < 1
    || ordinal > ALTERNATING_TRAIL_MAX_TARGETS
  ) {
    throw new RangeError(
      `The alternating-trail ordinal must be between 1 and ${ALTERNATING_TRAIL_MAX_TARGETS}`,
    )
  }

  const zeroBasedOrdinal = ordinal - 1

  if (zeroBasedOrdinal % 2 === 0) {
    return {
      ordinal,
      kind: "number",
      label: String(Math.floor(zeroBasedOrdinal / 2) + 1),
    }
  }

  return {
    ordinal,
    kind: "letter",
    label: String.fromCharCode(65 + Math.floor(zeroBasedOrdinal / 2)),
  }
}

export function createAlternatingTrailSequence(
  cellCount: SchulteCellCount,
): AlternatingTrailTarget[] {
  return Array.from(
    { length: cellCount },
    (_, index) => getAlternatingTrailTarget(index + 1),
  )
}

export function formatAlternatingTrailTarget(ordinal: number): string {
  return getAlternatingTrailTarget(ordinal).label
}
