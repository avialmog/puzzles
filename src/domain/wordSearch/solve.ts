import type { PlacedWord } from './types'
import { DIRECTIONS } from './types'

export interface SolveResult {
  found: PlacedWord[]
  notFound: string[]
}

export function findWordInGrid(grid: string[][], word: string): PlacedWord | null {
  const size = grid.length
  if (size === 0 || word.length === 0) return null

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      for (const dir of DIRECTIONS) {
        let matches = true
        for (let i = 0; i < word.length; i++) {
          const rr = r + dir.dr * i
          const cc = c + dir.dc * i
          if (rr < 0 || rr >= size || cc < 0 || cc >= grid[rr].length || grid[rr][cc] !== word[i]) {
            matches = false
            break
          }
        }
        if (matches) return { word, row: r, col: c, dir }
      }
    }
  }

  return null
}

export function solveWordSearch(grid: string[][], words: string[]): SolveResult {
  const found: PlacedWord[] = []
  const notFound: string[] = []

  for (const word of words) {
    const placement = findWordInGrid(grid, word)
    if (placement) found.push(placement)
    else notFound.push(word)
  }

  return { found, notFound }
}
