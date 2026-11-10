import { describe, expect, it } from 'vitest'
import {
  applyHomography,
  cellBounds,
  computeHomography,
  extractCell,
  inkRatio,
  warpToSquare,
  type PixelBuffer,
} from './imageProcessing'

describe('computeHomography / applyHomography', () => {
  it('maps points exactly for an identity transform', () => {
    const square: [any, any, any, any] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]
    const h = computeHomography(square, square)
    for (const p of square) {
      const result = applyHomography(h, p.x, p.y)
      expect(result.x).toBeCloseTo(p.x, 5)
      expect(result.y).toBeCloseTo(p.y, 5)
    }
  })

  it('maps a simple scale transform correctly', () => {
    const from: [any, any, any, any] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]
    const to: [any, any, any, any] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ]
    const h = computeHomography(from, to)
    const mid = applyHomography(h, 0.5, 0.5)
    expect(mid.x).toBeCloseTo(50, 3)
    expect(mid.y).toBeCloseTo(50, 3)
  })

  it('handles a genuine perspective (non-affine) mapping', () => {
    // A trapezoid in source photo coords mapping to a straightened square.
    const photoCorners: [any, any, any, any] = [
      { x: 20, y: 10 },
      { x: 90, y: 15 },
      { x: 95, y: 100 },
      { x: 15, y: 95 },
    ]
    const square: [any, any, any, any] = [
      { x: 0, y: 0 },
      { x: 99, y: 0 },
      { x: 99, y: 99 },
      { x: 0, y: 99 },
    ]
    const h = computeHomography(square, photoCorners)
    for (let i = 0; i < 4; i++) {
      const result = applyHomography(h, square[i].x, square[i].y)
      expect(result.x).toBeCloseTo(photoCorners[i].x, 3)
      expect(result.y).toBeCloseTo(photoCorners[i].y, 3)
    }
  })
})

function solidBuffer(width: number, height: number, [r, g, b, a]: [number, number, number, number]): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  }
  return { width, height, data }
}

describe('warpToSquare', () => {
  it('reproduces the source image when corners already form a square', () => {
    const src = solidBuffer(8, 8, [200, 100, 50, 255])
    const warped = warpToSquare(
      src,
      [
        { x: 0, y: 0 },
        { x: 7, y: 0 },
        { x: 7, y: 7 },
        { x: 0, y: 7 },
      ],
      8,
    )
    expect(warped.width).toBe(8)
    expect(warped.data[0]).toBeCloseTo(200, 0)
    expect(warped.data[1]).toBeCloseTo(100, 0)
    expect(warped.data[2]).toBeCloseTo(50, 0)
  })
})

describe('cellBounds', () => {
  it('divides the output size evenly across the grid', () => {
    const bounds = cellBounds(90, 9, 2, 3)
    expect(bounds.size).toBe(10)
    expect(bounds.x).toBe(30)
    expect(bounds.y).toBe(20)
  })
})

describe('extractCell', () => {
  it('extracts the correct sub-region', () => {
    const src = solidBuffer(4, 4, [0, 0, 0, 255])
    // Paint the bottom-right 2x2 quadrant white.
    for (let y = 2; y < 4; y++) {
      for (let x = 2; x < 4; x++) {
        const i = (y * 4 + x) * 4
        src.data[i] = 255
        src.data[i + 1] = 255
        src.data[i + 2] = 255
      }
    }
    const cell = extractCell(src, { x: 2, y: 2, size: 2 })
    expect(cell.width).toBe(2)
    expect(cell.data[0]).toBe(255)
  })
})

describe('inkRatio', () => {
  it('reports near-zero ink for a blank white cell', () => {
    const cell = solidBuffer(20, 20, [255, 255, 255, 255])
    expect(inkRatio(cell)).toBe(0)
  })

  it('reports high ink for a mostly black cell', () => {
    const cell = solidBuffer(20, 20, [0, 0, 0, 255])
    expect(inkRatio(cell)).toBeGreaterThan(0.9)
  })
})
