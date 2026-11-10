import { tryPlaceWord } from './placement'
import type { WordSearchPuzzle } from './types'
import { CATEGORIES } from './wordList'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DEFAULT_SIZE = 12
const DEFAULT_WORD_COUNT = 8

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function generateWordSearch(
  categoryName: string = CATEGORIES[0].name,
  rng: () => number = Math.random,
  size: number = DEFAULT_SIZE,
): WordSearchPuzzle {
  const category = CATEGORIES.find((c) => c.name === categoryName) ?? CATEGORIES[0]
  const words = shuffle(category.words, rng)
    .slice(0, DEFAULT_WORD_COUNT)
    .sort((a, b) => b.length - a.length)

  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''))
  const placed = []
  const dropped: string[] = []

  for (const word of words) {
    const result = tryPlaceWord(grid, size, word, rng)
    if (result) {
      placed.push(result)
    } else {
      dropped.push(word)
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = ALPHABET[Math.floor(rng() * ALPHABET.length)]
      }
    }
  }

  return { grid, size, placed, dropped, category: category.name }
}
