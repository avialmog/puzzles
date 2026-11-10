import { describe, expect, it } from 'vitest'
import { estimateGridSize, type PixelBuffer } from './imageProcessing'

function drawSyntheticGrid(dim: number, size: number): PixelBuffer {
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255)
  const cellPx = dim / size

  function setPixel(x: number, y: number, value: number) {
    if (x < 0 || x >= dim || y < 0 || y >= dim) return
    const i = (y * dim + x) * 4
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    data[i + 3] = 255
  }

  for (let k = 0; k <= size; k++) {
    const pos = Math.round(k * cellPx)
    for (let i = 0; i < dim; i++) {
      setPixel(pos, i, 0)
      setPixel(i, pos, 0)
    }
  }

  return { width: dim, height: dim, data }
}

describe('estimateGridSize', () => {
  it('detects a 9x9 grid', () => {
    const buffer = drawSyntheticGrid(360, 9)
    expect(estimateGridSize(buffer, 5, 20)).toBe(9)
  })

  it('detects a 15x15 grid', () => {
    const buffer = drawSyntheticGrid(450, 15)
    expect(estimateGridSize(buffer, 5, 25)).toBe(15)
  })

  it('detects a 5x5 grid', () => {
    const buffer = drawSyntheticGrid(200, 5)
    expect(estimateGridSize(buffer, 3, 20)).toBe(5)
  })

  it('detects a 12x12 grid even when the search range is wide', () => {
    const buffer = drawSyntheticGrid(480, 12)
    expect(estimateGridSize(buffer, 3, 25)).toBe(12)
  })
})
