export const SCHULTE_LAYOUT_COUNTS = [25, 36, 49] as const

export type SchulteLayoutCount = (typeof SCHULTE_LAYOUT_COUNTS)[number]

export const SCHULTE_LAYOUT_TEMPLATES = [
  "concentric",
  "golden-angle",
  "offset-grid",
] as const

export type SchulteLayoutTemplate =
  (typeof SCHULTE_LAYOUT_TEMPLATES)[number]

export interface SchultePoint {
  x: number
  y: number
}

export interface SchulteBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface SchulteCellLayout {
  id: string
  index: number
  row: number
  column: number
  points: SchultePoint[]
  /** Exact Voronoi region. Use this path for pointer hit testing. */
  hitPath: string
  /** Inset, rounded path intended for the visible pebble surface. */
  path: string
  center: SchultePoint
  bounds: SchulteBounds
  /** Diameter of the centered safe circle, in viewBox units. */
  minDimension: number
  safeDiameter: number
  cornerRadius: number
  /** Relative hint for number sizing. One is the nominal size. */
  fontScale: number
}

export interface SchulteLayout {
  count: SchulteLayoutCount
  side: 5 | 6 | 7
  rows: 5 | 6 | 7
  columns: 5 | 6 | 7
  template: SchulteLayoutTemplate
  seed: number
  deformation: number
  viewBox: {
    x: 0
    y: 0
    width: number
    height: number
  }
  clipCircle: {
    cx: number
    cy: number
    r: number
  }
  boundary: SchultePoint[]
  boardPath: string
  cells: SchulteCellLayout[]
  minCellDimension: number
}

export interface CreateSchulteLayoutOptions {
  count: SchulteLayoutCount
  template?: SchulteLayoutTemplate
  seed?: number | string
  /** SVG coordinate size. The default viewBox is 0 0 1000 1000. */
  size?: number
  /** Empty margin around the circular board, in viewBox units. */
  padding?: number
  /** Visual gap between cells. Hit regions still tile without gaps. */
  gap?: number
  /** Requested visual corner radius, in viewBox units. */
  cornerRadius?: number
  /** Seeded shape variation from 0 (base topology) to 1 (full). */
  deformation?: number
  /**
   * Optional lower bound for every cell's centered safe diameter.
   * Shape variation is reduced when necessary; impossible bounds throw.
   */
  minimumCellDimension?: number
}

const DEFAULT_SIZE = 1000
const BOUNDARY_SEGMENTS = 64
const EPSILON = 1e-7
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const RING_COUNTS: Record<SchulteLayoutCount, readonly number[]> = {
  25: [1, 8, 16],
  36: [1, 7, 12, 16],
  49: [1, 8, 16, 24],
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function hashSeed(seed: number | string) {
  const source = typeof seed === "number" && Number.isFinite(seed)
    ? String(seed)
    : String(seed)
  let hash = 2166136261

  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function mixSeed(seed: number, count: number, templateIndex: number) {
  let mixed = seed ^ Math.imul(count, 0x9e3779b1)
  mixed ^= Math.imul(templateIndex + 1, 0x85ebca6b)
  mixed ^= mixed >>> 16
  mixed = Math.imul(mixed, 0x7feb352d)
  mixed ^= mixed >>> 15
  mixed = Math.imul(mixed, 0x846ca68b)
  mixed ^= mixed >>> 16
  return mixed >>> 0
}

function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000
  }
}

function randomSigned(random: () => number) {
  return random() * 2 - 1
}

function formatCoordinate(value: number) {
  const rounded = Math.round(value * 1000) / 1000
  return Object.is(rounded, -0) ? "0" : String(rounded)
}

function polygonPath(points: readonly SchultePoint[]) {
  if (points.length === 0) return ""
  return `${points
    .map((point, index) => `${index === 0 ? "M" : "L"}${formatCoordinate(point.x)} ${formatCoordinate(point.y)}`)
    .join(" ")} Z`
}

function distance(left: SchultePoint, right: SchultePoint) {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

function roundedPolygonPath(
  points: readonly SchultePoint[],
  requestedRadius: number,
) {
  if (points.length < 3 || requestedRadius <= 0) return polygonPath(points)

  const corners = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length]
    const next = points[(index + 1) % points.length]
    const previousLength = distance(point, previous)
    const nextLength = distance(point, next)
    const radius = Math.min(
      requestedRadius,
      previousLength * 0.28,
      nextLength * 0.28,
    )

    return {
      point,
      before: {
        x: point.x + ((previous.x - point.x) / previousLength) * radius,
        y: point.y + ((previous.y - point.y) / previousLength) * radius,
      },
      after: {
        x: point.x + ((next.x - point.x) / nextLength) * radius,
        y: point.y + ((next.y - point.y) / nextLength) * radius,
      },
    }
  })

  const last = corners[corners.length - 1]
  const commands = [`M${formatCoordinate(last.after.x)} ${formatCoordinate(last.after.y)}`]

  for (const corner of corners) {
    commands.push(
      `L${formatCoordinate(corner.before.x)} ${formatCoordinate(corner.before.y)}`,
      `Q${formatCoordinate(corner.point.x)} ${formatCoordinate(corner.point.y)} ${formatCoordinate(corner.after.x)} ${formatCoordinate(corner.after.y)}`,
    )
  }

  commands.push("Z")
  return commands.join(" ")
}

function createCircleBoundary(
  center: SchultePoint,
  radius: number,
): SchultePoint[] {
  return Array.from({ length: BOUNDARY_SEGMENTS }, (_, index) => {
    const angle = -Math.PI / 2 + (index / BOUNDARY_SEGMENTS) * Math.PI * 2
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    }
  })
}

function polygonSignedArea(points: readonly SchultePoint[]) {
  let twiceArea = 0
  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    const next = points[(index + 1) % points.length]
    twiceArea += point.x * next.y - next.x * point.y
  }
  return twiceArea / 2
}

function polygonCentroid(points: readonly SchultePoint[]): SchultePoint {
  const signedArea = polygonSignedArea(points)

  if (Math.abs(signedArea) <= EPSILON) {
    return {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    }
  }

  let x = 0
  let y = 0
  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    const next = points[(index + 1) % points.length]
    const cross = point.x * next.y - next.x * point.y
    x += (point.x + next.x) * cross
    y += (point.y + next.y) * cross
  }

  const factor = 1 / (6 * signedArea)
  return { x: x * factor, y: y * factor }
}

function cleanPolygon(points: readonly SchultePoint[]): SchultePoint[] {
  const cleaned: SchultePoint[] = []

  for (const point of points) {
    const previous = cleaned[cleaned.length - 1]
    if (!previous || distance(previous, point) > EPSILON) cleaned.push(point)
  }

  if (
    cleaned.length > 1
    && distance(cleaned[0], cleaned[cleaned.length - 1]) <= EPSILON
  ) {
    cleaned.pop()
  }

  return cleaned
}

function clipToCloserHalfPlane(
  polygon: readonly SchultePoint[],
  site: SchultePoint,
  competitor: SchultePoint,
) {
  if (polygon.length === 0) return []

  const normalX = competitor.x - site.x
  const normalY = competitor.y - site.y
  const limit = (
    competitor.x * competitor.x
    + competitor.y * competitor.y
    - site.x * site.x
    - site.y * site.y
  ) / 2
  const signedDistance = (point: SchultePoint) => (
    point.x * normalX + point.y * normalY - limit
  )
  const result: SchultePoint[] = []

  for (let index = 0; index < polygon.length; index++) {
    const current = polygon[index]
    const next = polygon[(index + 1) % polygon.length]
    const currentDistance = signedDistance(current)
    const nextDistance = signedDistance(next)
    const currentInside = currentDistance <= EPSILON
    const nextInside = nextDistance <= EPSILON

    if (currentInside && nextInside) {
      result.push(next)
      continue
    }

    if (currentInside !== nextInside) {
      const denominator = currentDistance - nextDistance
      const ratio = Math.abs(denominator) <= EPSILON
        ? 0
        : currentDistance / denominator
      result.push({
        x: current.x + (next.x - current.x) * ratio,
        y: current.y + (next.y - current.y) * ratio,
      })
    }

    if (!currentInside && nextInside) result.push(next)
  }

  return cleanPolygon(result)
}

function createVoronoiCells(
  sites: readonly SchultePoint[],
  boundary: readonly SchultePoint[],
) {
  return sites.map((site, siteIndex) => {
    let polygon = [...boundary]

    for (let competitorIndex = 0; competitorIndex < sites.length; competitorIndex++) {
      if (competitorIndex === siteIndex) continue
      polygon = clipToCloserHalfPlane(
        polygon,
        site,
        sites[competitorIndex],
      )
      if (polygon.length === 0) break
    }

    return polygon
  })
}

function constrainToCircle(
  point: SchultePoint,
  center: SchultePoint,
  maximumRadius: number,
) {
  const deltaX = point.x - center.x
  const deltaY = point.y - center.y
  const pointRadius = Math.hypot(deltaX, deltaY)
  if (pointRadius <= maximumRadius) return point
  const scale = maximumRadius / pointRadius
  return {
    x: center.x + deltaX * scale,
    y: center.y + deltaY * scale,
  }
}

function createConcentricSites(
  count: SchulteLayoutCount,
  center: SchultePoint,
  radius: number,
  random: () => number,
  deformation: number,
) {
  const ringCounts = RING_COUNTS[count]
  const ringRadii = ringCounts.length === 3
    ? [0, 0.39, 0.78]
    : [0, 0.27, 0.53, 0.8]
  const nominalSpacing = radius / Math.sqrt(count)
  const sites: SchultePoint[] = []

  ringCounts.forEach((ringCount, ringIndex) => {
    if (ringCount === 1) {
      sites.push({
        x: center.x + randomSigned(random) * nominalSpacing * 0.08 * deformation,
        y: center.y + randomSigned(random) * nominalSpacing * 0.08 * deformation,
      })
      return
    }

    const baseRadius = radius * ringRadii[ringIndex]
    const phase = ringIndex * 0.29 + (ringIndex % 2) * Math.PI / ringCount
    for (let index = 0; index < ringCount; index++) {
      const angleStep = (Math.PI * 2) / ringCount
      const angle = phase + index * angleStep
        + randomSigned(random) * angleStep * 0.12 * deformation
      const siteRadius = baseRadius
        + randomSigned(random) * nominalSpacing * 0.11 * deformation
      sites.push({
        x: center.x + Math.cos(angle) * siteRadius,
        y: center.y + Math.sin(angle) * siteRadius,
      })
    }
  })

  return sites
}

function createGoldenAngleSites(
  count: SchulteLayoutCount,
  center: SchultePoint,
  radius: number,
  random: () => number,
  deformation: number,
) {
  const nominalSpacing = radius / Math.sqrt(count)
  const phase = Math.PI * 0.17

  return Array.from({ length: count }, (_, index) => {
    const baseRadius = radius * 0.87 * Math.sqrt((index + 0.38) / count)
    const siteRadius = baseRadius
      + randomSigned(random) * nominalSpacing * 0.1 * deformation
    const angle = phase + index * GOLDEN_ANGLE
      + randomSigned(random) * 0.055 * deformation

    return {
      x: center.x + Math.cos(angle) * siteRadius,
      y: center.y + Math.sin(angle) * siteRadius,
    }
  })
}

function mapSquareToDisc(x: number, y: number) {
  return {
    x: x * Math.sqrt(Math.max(0, 1 - (y * y) / 2)),
    y: y * Math.sqrt(Math.max(0, 1 - (x * x) / 2)),
  }
}

function createOffsetGridSites(
  count: SchulteLayoutCount,
  center: SchultePoint,
  radius: number,
  random: () => number,
  deformation: number,
) {
  const side = Math.sqrt(count)
  const sourceStep = 2 / side

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / side)
    const column = index % side
    const rowOffset = (row % 2 === 0 ? -1 : 1) * sourceStep * 0.07
    const columnWave = Math.sin((column + 1) * 1.37) * sourceStep * 0.035
    const sourceX = clamp(
      -1 + (column + 0.5) * sourceStep
        + rowOffset
        + randomSigned(random) * sourceStep * 0.075 * deformation,
      -0.94,
      0.94,
    )
    const sourceY = clamp(
      -1 + (row + 0.5) * sourceStep
        + columnWave
        + randomSigned(random) * sourceStep * 0.075 * deformation,
      -0.94,
      0.94,
    )
    const mapped = mapSquareToDisc(sourceX, sourceY)

    return {
      x: center.x + mapped.x * radius * 0.9,
      y: center.y + mapped.y * radius * 0.9,
    }
  })
}

function createSites(
  count: SchulteLayoutCount,
  template: SchulteLayoutTemplate,
  center: SchultePoint,
  radius: number,
  seed: number,
  deformation: number,
) {
  const templateIndex = SCHULTE_LAYOUT_TEMPLATES.indexOf(template)
  const random = createRandom(mixSeed(seed, count, templateIndex))
  const sites = template === "concentric"
    ? createConcentricSites(count, center, radius, random, deformation)
    : template === "golden-angle"
      ? createGoldenAngleSites(count, center, radius, random, deformation)
      : createOffsetGridSites(count, center, radius, random, deformation)

  const initialCells = createVoronoiCells(
    sites,
    createCircleBoundary(center, radius),
  )

  return sites.map((site, index) => {
    const centroid = polygonCentroid(initialCells[index])
    const relaxed = {
      x: site.x + (centroid.x - site.x) * 0.74,
      y: site.y + (centroid.y - site.y) * 0.74,
    }
    return constrainToCircle(relaxed, center, radius * 0.94)
  })
}

function getBounds(points: readonly SchultePoint[]): SchulteBounds {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minimumX = Math.min(...xs)
  const maximumX = Math.max(...xs)
  const minimumY = Math.min(...ys)
  const maximumY = Math.max(...ys)

  return {
    x: minimumX,
    y: minimumY,
    width: maximumX - minimumX,
    height: maximumY - minimumY,
  }
}

function distanceToSegment(
  point: SchultePoint,
  start: SchultePoint,
  end: SchultePoint,
) {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  if (lengthSquared <= EPSILON) return distance(point, start)
  const ratio = clamp(
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY)
      / lengthSquared,
    0,
    1,
  )
  return Math.hypot(
    point.x - (start.x + deltaX * ratio),
    point.y - (start.y + deltaY * ratio),
  )
}

function getSafeDiameter(
  center: SchultePoint,
  points: readonly SchultePoint[],
) {
  let minimumDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < points.length; index++) {
    minimumDistance = Math.min(
      minimumDistance,
      distanceToSegment(
        center,
        points[index],
        points[(index + 1) % points.length],
      ),
    )
  }
  return minimumDistance * 2
}

function insetPolygon(
  points: readonly SchultePoint[],
  center: SchultePoint,
  minDimension: number,
  gap: number,
) {
  const scale = clamp(1 - gap / Math.max(minDimension, EPSILON), 0.72, 1)
  return points.map((point) => ({
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale,
  }))
}

function buildLayoutCandidate({
  count,
  template,
  seed,
  size,
  padding,
  gap,
  cornerRadius,
  deformation,
}: {
  count: SchulteLayoutCount
  template: SchulteLayoutTemplate
  seed: number
  size: number
  padding: number
  gap: number
  cornerRadius: number
  deformation: number
}): SchulteLayout {
  const side = Math.sqrt(count) as 5 | 6 | 7
  const center = { x: size / 2, y: size / 2 }
  const radius = size / 2 - padding
  const boundary = createCircleBoundary(center, radius)
  const sites = createSites(
    count,
    template,
    center,
    radius,
    seed,
    deformation,
  )
  const polygons = createVoronoiCells(sites, boundary)
  const nominalDimension = (radius * 2) / side
  const cells = polygons.map((points, index): SchulteCellLayout => {
    if (points.length < 3 || Math.abs(polygonSignedArea(points)) <= EPSILON) {
      throw new Error(`Unable to create Schulte cell ${index}`)
    }

    const cellCenter = polygonCentroid(points)
    const bounds = getBounds(points)
    const safeDiameter = getSafeDiameter(cellCenter, points)
    const minDimension = Math.min(
      safeDiameter,
      bounds.width,
      bounds.height,
    )
    const actualCornerRadius = Math.min(
      cornerRadius,
      minDimension * 0.16,
    )
    const visualPoints = insetPolygon(
      points,
      cellCenter,
      minDimension,
      gap,
    )

    return {
      id: `schulte-cell-${index}`,
      index,
      row: Math.floor(index / side),
      column: index % side,
      points,
      hitPath: polygonPath(points),
      path: roundedPolygonPath(visualPoints, actualCornerRadius),
      center: cellCenter,
      bounds,
      minDimension,
      safeDiameter,
      cornerRadius: actualCornerRadius,
      fontScale: clamp(minDimension / nominalDimension, 0.58, 1.08),
    }
  })
  const minCellDimension = Math.min(
    ...cells.map((cell) => cell.minDimension),
  )

  return {
    count,
    side,
    rows: side,
    columns: side,
    template,
    seed,
    deformation,
    viewBox: { x: 0, y: 0, width: size, height: size },
    clipCircle: { cx: center.x, cy: center.y, r: radius },
    boundary,
    boardPath: polygonPath(boundary),
    cells,
    minCellDimension,
  }
}

export function createSchulteLayout(
  options: CreateSchulteLayoutOptions,
): SchulteLayout {
  const {
    count,
    seed: inputSeed = 0,
    size = DEFAULT_SIZE,
    padding = size * 0.035,
    gap = size * 0.008,
    cornerRadius = size * 0.014,
    deformation: requestedDeformation = 1,
    minimumCellDimension = 0,
  } = options

  if (!SCHULTE_LAYOUT_COUNTS.includes(count)) {
    throw new RangeError("Schulte layout count must be 25, 36, or 49")
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError("Schulte layout size must be positive")
  }
  if (!Number.isFinite(padding) || padding < 0 || padding >= size * 0.3) {
    throw new RangeError("Schulte layout padding is outside the supported range")
  }
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError("Schulte layout gap cannot be negative")
  }
  if (!Number.isFinite(cornerRadius) || cornerRadius < 0) {
    throw new RangeError("Schulte layout corner radius cannot be negative")
  }
  if (
    !Number.isFinite(requestedDeformation)
    || requestedDeformation < 0
    || requestedDeformation > 1
  ) {
    throw new RangeError("Schulte layout deformation must be between 0 and 1")
  }
  if (!Number.isFinite(minimumCellDimension) || minimumCellDimension < 0) {
    throw new RangeError("Schulte minimum cell dimension cannot be negative")
  }

  const seed = hashSeed(inputSeed)
  const template = options.template
    ?? SCHULTE_LAYOUT_TEMPLATES[seed % SCHULTE_LAYOUT_TEMPLATES.length]

  if (!SCHULTE_LAYOUT_TEMPLATES.includes(template)) {
    throw new RangeError("Unknown Schulte layout template")
  }

  const deformationCandidates = requestedDeformation === 0
    ? [0]
    : [1, 0.8, 0.6, 0.4, 0.2, 0].map(
        (scale) => requestedDeformation * scale,
      )
  let lastCandidate: SchulteLayout | null = null

  for (const deformation of deformationCandidates) {
    const candidate = buildLayoutCandidate({
      count,
      template,
      seed,
      size,
      padding,
      gap,
      cornerRadius,
      deformation,
    })
    lastCandidate = candidate
    if (candidate.minCellDimension + EPSILON >= minimumCellDimension) {
      return candidate
    }
  }

  throw new RangeError(
    `The requested minimum cell dimension cannot be met; maximum available is ${formatCoordinate(lastCandidate?.minCellDimension ?? 0)}`,
  )
}
