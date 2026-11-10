export interface Point {
  x: number
  y: number
}

export interface PixelBuffer {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface Homography {
  h11: number
  h12: number
  h13: number
  h21: number
  h22: number
  h23: number
  h31: number
  h32: number
}

function solveLinearSystem(a: number[][], b: number[]): number[] {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])

  for (let col = 0; col < n; col++) {
    let pivotRow = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivotRow][col])) pivotRow = r
    }
    ;[m[col], m[pivotRow]] = [m[pivotRow], m[col]]

    const pivot = m[col][col]
    for (let c = col; c <= n; c++) m[col][c] /= pivot

    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const factor = m[r][col]
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c]
    }
  }

  return m.map((row) => row[n])
}

/** Computes the homography mapping each point in `from` to the corresponding point in `to`. */
export function computeHomography(from: [Point, Point, Point, Point], to: [Point, Point, Point, Point]): Homography {
  const a: number[][] = []
  const b: number[] = []

  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i]
    const { x: X, y: Y } = to[i]
    a.push([x, y, 1, 0, 0, 0, -x * X, -y * X])
    b.push(X)
    a.push([0, 0, 0, x, y, 1, -x * Y, -y * Y])
    b.push(Y)
  }

  const [h11, h12, h13, h21, h22, h23, h31, h32] = solveLinearSystem(a, b)
  return { h11, h12, h13, h21, h22, h23, h31, h32 }
}

export function applyHomography(h: Homography, x: number, y: number): Point {
  const denom = h.h31 * x + h.h32 * y + 1
  return {
    x: (h.h11 * x + h.h12 * y + h.h13) / denom,
    y: (h.h21 * x + h.h22 * y + h.h23) / denom,
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function samplePixel(src: PixelBuffer, x: number, y: number): [number, number, number, number] {
  const sx = clamp(x, 0, src.width - 1)
  const sy = clamp(y, 0, src.height - 1)
  const x0 = Math.floor(sx)
  const y0 = Math.floor(sy)
  const x1 = Math.min(x0 + 1, src.width - 1)
  const y1 = Math.min(y0 + 1, src.height - 1)
  const fx = sx - x0
  const fy = sy - y0

  const at = (px: number, py: number, channel: number) => src.data[(py * src.width + px) * 4 + channel]

  const result: [number, number, number, number] = [0, 0, 0, 0]
  for (let c = 0; c < 4; c++) {
    const top = at(x0, y0, c) * (1 - fx) + at(x1, y0, c) * fx
    const bottom = at(x0, y1, c) * (1 - fx) + at(x1, y1, c) * fx
    result[c] = top * (1 - fy) + bottom * fy
  }
  return result
}

/** Perspective-corrects the quadrilateral `corners` (TL, TR, BR, BL) in `src` into an `outputSize`-square buffer. */
export function warpToSquare(src: PixelBuffer, corners: [Point, Point, Point, Point], outputSize: number): PixelBuffer {
  const destCorners: [Point, Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: outputSize - 1, y: 0 },
    { x: outputSize - 1, y: outputSize - 1 },
    { x: 0, y: outputSize - 1 },
  ]
  const h = computeHomography(destCorners, corners)

  const data = new Uint8ClampedArray(outputSize * outputSize * 4)
  for (let y = 0; y < outputSize; y++) {
    for (let x = 0; x < outputSize; x++) {
      const { x: sx, y: sy } = applyHomography(h, x, y)
      const [r, g, b, a] = samplePixel(src, sx, sy)
      const i = (y * outputSize + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }

  return { width: outputSize, height: outputSize, data }
}

export interface CellBounds {
  x: number
  y: number
  size: number
}

export function cellBounds(outputSize: number, gridSize: number, row: number, col: number): CellBounds {
  const size = outputSize / gridSize
  return { x: col * size, y: row * size, size }
}

export function extractCell(buffer: PixelBuffer, bounds: CellBounds): PixelBuffer {
  const size = Math.round(bounds.size)
  const data = new Uint8ClampedArray(size * size * 4)
  const startX = Math.round(bounds.x)
  const startY = Math.round(bounds.y)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcX = clamp(startX + x, 0, buffer.width - 1)
      const srcY = clamp(startY + y, 0, buffer.height - 1)
      const srcI = (srcY * buffer.width + srcX) * 4
      const destI = (y * size + x) * 4
      data[destI] = buffer.data[srcI]
      data[destI + 1] = buffer.data[srcI + 1]
      data[destI + 2] = buffer.data[srcI + 2]
      data[destI + 3] = buffer.data[srcI + 3]
    }
  }

  return { width: size, height: size, data }
}

/** Fraction of pixels darker than `threshold`, ignoring a margin around the edge where grid lines live. */
export function inkRatio(buffer: PixelBuffer, threshold = 128, marginRatio = 0.12): number {
  const margin = Math.round(buffer.width * marginRatio)
  let dark = 0
  let total = 0

  for (let y = margin; y < buffer.height - margin; y++) {
    for (let x = margin; x < buffer.width - margin; x++) {
      const i = (y * buffer.width + x) * 4
      const luminance = 0.299 * buffer.data[i] + 0.587 * buffer.data[i + 1] + 0.114 * buffer.data[i + 2]
      if (luminance < threshold) dark++
      total++
    }
  }

  return total === 0 ? 0 : dark / total
}
