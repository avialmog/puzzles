import type { Grid } from './types'
import { cloneGrid } from './types'

const ALL_BITS = 0b111111111

interface Masks {
  row: number[]
  col: number[]
  box: number[]
}

function boxIndex(r: number, c: number): number {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3)
}

function buildMasks(grid: Grid): Masks {
  const row = Array(9).fill(0)
  const col = Array(9).fill(0)
  const box = Array(9).fill(0)
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c]
      if (v === 0) continue
      const bit = 1 << (v - 1)
      row[r] |= bit
      col[c] |= bit
      box[boxIndex(r, c)] |= bit
    }
  }
  return { row, col, box }
}

function candidateBits(r: number, c: number, masks: Masks): number {
  return ALL_BITS & ~(masks.row[r] | masks.col[c] | masks.box[boxIndex(r, c)])
}

function popcount(bits: number): number {
  let count = 0
  let x = bits
  while (x) {
    x &= x - 1
    count++
  }
  return count
}

function bitsToDigits(bits: number): number[] {
  const digits: number[] = []
  for (let d = 1; d <= 9; d++) {
    if (bits & (1 << (d - 1))) digits.push(d)
  }
  return digits
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function findMrvCell(grid: Grid, masks: Masks): { r: number; c: number; bits: number } | null {
  let best: { r: number; c: number; bits: number } | null = null
  let bestCount = 10
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] !== 0) continue
      const bits = candidateBits(r, c, masks)
      const count = popcount(bits)
      if (count < bestCount) {
        bestCount = count
        best = { r, c, bits }
        if (count === 0) return best
      }
    }
  }
  return best
}

export function solveOne(grid: Grid, rng?: () => number): Grid | null {
  const working = cloneGrid(grid)
  const masks = buildMasks(working)

  function place(r: number, c: number, d: number) {
    working[r][c] = d
    const bit = 1 << (d - 1)
    masks.row[r] |= bit
    masks.col[c] |= bit
    masks.box[boxIndex(r, c)] |= bit
  }

  function unplace(r: number, c: number, d: number) {
    working[r][c] = 0
    const bit = ~(1 << (d - 1))
    masks.row[r] &= bit
    masks.col[c] &= bit
    masks.box[boxIndex(r, c)] &= bit
  }

  function backtrack(): boolean {
    const cell = findMrvCell(working, masks)
    if (!cell) return true
    if (cell.bits === 0) return false

    const digits = bitsToDigits(cell.bits)
    const ordered = rng ? shuffle(digits, rng) : digits
    for (const d of ordered) {
      place(cell.r, cell.c, d)
      if (backtrack()) return true
      unplace(cell.r, cell.c, d)
    }
    return false
  }

  return backtrack() ? working : null
}

export function countSolutions(grid: Grid, limit: number): number {
  const working = cloneGrid(grid)
  const masks = buildMasks(working)
  let found = 0

  function place(r: number, c: number, d: number) {
    working[r][c] = d
    const bit = 1 << (d - 1)
    masks.row[r] |= bit
    masks.col[c] |= bit
    masks.box[boxIndex(r, c)] |= bit
  }

  function unplace(r: number, c: number, d: number) {
    working[r][c] = 0
    const bit = ~(1 << (d - 1))
    masks.row[r] &= bit
    masks.col[c] &= bit
    masks.box[boxIndex(r, c)] &= bit
  }

  function backtrack() {
    if (found >= limit) return
    const cell = findMrvCell(working, masks)
    if (!cell) {
      found++
      return
    }
    if (cell.bits === 0) return

    for (const d of bitsToDigits(cell.bits)) {
      place(cell.r, cell.c, d)
      backtrack()
      unplace(cell.r, cell.c, d)
      if (found >= limit) return
    }
  }

  backtrack()
  return found
}

export function logicOnlySolve(grid: Grid): { solved: boolean; grid: Grid } {
  const working = cloneGrid(grid)
  let progress = true

  while (progress) {
    progress = false
    const masks = buildMasks(working)

    // Naked singles: a cell with exactly one candidate.
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (working[r][c] !== 0) continue
        const bits = candidateBits(r, c, masks)
        if (popcount(bits) === 1) {
          const [d] = bitsToDigits(bits)
          working[r][c] = d
          progress = true
        }
      }
    }
    if (progress) continue

    // Hidden singles: a digit that fits in exactly one cell within a row/col/box.
    const units: Array<Array<[number, number]>> = []
    for (let r = 0; r < 9; r++) units.push(Array.from({ length: 9 }, (_, c) => [r, c]))
    for (let c = 0; c < 9; c++) units.push(Array.from({ length: 9 }, (_, r) => [r, c]))
    for (let b = 0; b < 9; b++) {
      const br = Math.floor(b / 3) * 3
      const bc = (b % 3) * 3
      const cells: Array<[number, number]> = []
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) cells.push([br + dr, bc + dc])
      }
      units.push(cells)
    }

    hiddenSingleSearch: for (const unit of units) {
      for (let d = 1; d <= 9; d++) {
        const bit = 1 << (d - 1)
        let placement: [number, number] | null = null
        let count = 0
        for (const [r, c] of unit) {
          if (working[r][c] !== 0) continue
          const bits = candidateBits(r, c, masks)
          if (bits & bit) {
            count++
            placement = [r, c]
          }
        }
        if (count === 1 && placement) {
          const [r, c] = placement
          working[r][c] = d
          progress = true
          break hiddenSingleSearch
        }
      }
    }
  }

  const solved = working.every((row) => row.every((v) => v !== 0))
  return { solved, grid: working }
}
