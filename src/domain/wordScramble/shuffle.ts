import type { WordEntry } from './types'
import { WORD_LIST } from './wordList'

const MAX_SHUFFLE_ATTEMPTS = 50

function countMovedPositions(a: string, b: string): number {
  let moved = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) moved++
  }
  return moved
}

function fisherYates(letters: string[], rng: () => number): string[] {
  const result = [...letters]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function scrambleWord(word: string, rng: () => number = Math.random): string {
  const minMoved = Math.min(2, word.length - 1)
  let best = word
  let bestMoved = -1

  for (let attempt = 0; attempt < MAX_SHUFFLE_ATTEMPTS; attempt++) {
    const candidate = fisherYates(word.split(''), rng).join('')
    if (candidate === word) continue
    const moved = countMovedPositions(word, candidate)
    if (moved >= minMoved) return candidate
    if (moved > bestMoved) {
      best = candidate
      bestMoved = moved
    }
  }

  return bestMoved >= 0 ? best : word
}

export function pickRandomEntry(exclude?: string, rng: () => number = Math.random): WordEntry {
  const pool = exclude ? WORD_LIST.filter((e) => e.word !== exclude) : WORD_LIST
  const index = Math.floor(rng() * pool.length)
  return pool[index]
}
