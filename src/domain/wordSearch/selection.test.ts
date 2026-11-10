import { describe, expect, it } from 'vitest'
import { findMatchingWord, lineCells, matchesPlacedWord } from './selection'
import type { PlacedWord } from './types'

describe('lineCells', () => {
  it('returns a single cell when start equals end', () => {
    expect(lineCells({ r: 2, c: 2 }, { r: 2, c: 2 })).toEqual([{ r: 2, c: 2 }])
  })

  it('returns a horizontal line', () => {
    expect(lineCells({ r: 1, c: 1 }, { r: 1, c: 4 })).toEqual([
      { r: 1, c: 1 },
      { r: 1, c: 2 },
      { r: 1, c: 3 },
      { r: 1, c: 4 },
    ])
  })

  it('returns a diagonal line', () => {
    expect(lineCells({ r: 0, c: 0 }, { r: 2, c: 2 })).toEqual([
      { r: 0, c: 0 },
      { r: 1, c: 1 },
      { r: 2, c: 2 },
    ])
  })

  it('returns null for a non-straight, non-diagonal drag', () => {
    expect(lineCells({ r: 0, c: 0 }, { r: 2, c: 3 })).toBeNull()
  })
})

describe('matchesPlacedWord', () => {
  const placed: PlacedWord = { word: 'CAT', row: 0, col: 0, dir: { dr: 0, dc: 1 } }

  it('matches the forward direction', () => {
    const cells = [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }]
    expect(matchesPlacedWord(cells, placed)).toBe(true)
  })

  it('matches the reverse direction', () => {
    const cells = [{ r: 0, c: 2 }, { r: 0, c: 1 }, { r: 0, c: 0 }]
    expect(matchesPlacedWord(cells, placed)).toBe(true)
  })

  it('rejects a different length selection', () => {
    const cells = [{ r: 0, c: 0 }, { r: 0, c: 1 }]
    expect(matchesPlacedWord(cells, placed)).toBe(false)
  })

  it('rejects a selection along the wrong cells', () => {
    const cells = [{ r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }]
    expect(matchesPlacedWord(cells, placed)).toBe(false)
  })
})

describe('findMatchingWord', () => {
  it('finds the placed word matching the given cells', () => {
    const placedWords: PlacedWord[] = [
      { word: 'CAT', row: 0, col: 0, dir: { dr: 0, dc: 1 } },
      { word: 'DOG', row: 2, col: 2, dir: { dr: 1, dc: 0 } },
    ]
    const cells = [{ r: 2, c: 2 }, { r: 3, c: 2 }, { r: 4, c: 2 }]
    expect(findMatchingWord(cells, placedWords)?.word).toBe('DOG')
  })

  it('returns null when nothing matches', () => {
    const placedWords: PlacedWord[] = [{ word: 'CAT', row: 0, col: 0, dir: { dr: 0, dc: 1 } }]
    const cells = [{ r: 5, c: 5 }, { r: 5, c: 6 }]
    expect(findMatchingWord(cells, placedWords)).toBeNull()
  })
})
