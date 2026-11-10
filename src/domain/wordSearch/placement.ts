import type { Direction, PlacedWord } from './types'
import { DIRECTIONS } from './types'

const MAX_ATTEMPTS_PER_WORD = 200

export function canPlace(grid: string[][], size: number, word: string, row: number, col: number, dir: Direction): boolean {
  for (let i = 0; i < word.length; i++) {
    const r = row + dir.dr * i
    const c = col + dir.dc * i
    if (r < 0 || r >= size || c < 0 || c >= size) return false
    const existing = grid[r][c]
    if (existing !== '' && existing !== word[i]) return false
  }
  return true
}

export function placeWord(grid: string[][], word: string, row: number, col: number, dir: Direction): void {
  for (let i = 0; i < word.length; i++) {
    const r = row + dir.dr * i
    const c = col + dir.dc * i
    grid[r][c] = word[i]
  }
}

export function tryPlaceWord(grid: string[][], size: number, word: string, rng: () => number): PlacedWord | null {
  for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_WORD; attempt++) {
    const dir = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)]
    const row = Math.floor(rng() * size)
    const col = Math.floor(rng() * size)
    if (canPlace(grid, size, word, row, col, dir)) {
      placeWord(grid, word, row, col, dir)
      return { word, row, col, dir }
    }
  }
  return null
}
