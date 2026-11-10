import { describe, expect, it } from 'vitest'
import { generateWordSearch } from './generator'
import { CATEGORIES } from './wordList'
import { wordCells } from './types'

describe('generateWordSearch', () => {
  it('fills every cell of the grid with a single uppercase letter', () => {
    const puzzle = generateWordSearch(CATEGORIES[0].name)
    for (const row of puzzle.grid) {
      for (const cell of row) {
        expect(cell).toMatch(/^[A-Z]$/)
      }
    }
  })

  it('places each placed word exactly along its claimed cells', () => {
    const puzzle = generateWordSearch(CATEGORIES[0].name)
    for (const placement of puzzle.placed) {
      const cells = wordCells(placement)
      const lettersOnGrid = cells.map(([r, c]) => puzzle.grid[r][c]).join('')
      expect(lettersOnGrid).toBe(placement.word)
    }
  })

  it('keeps every placed word in bounds', () => {
    const puzzle = generateWordSearch(CATEGORIES[0].name)
    for (const placement of puzzle.placed) {
      for (const [r, c] of wordCells(placement)) {
        expect(r).toBeGreaterThanOrEqual(0)
        expect(r).toBeLessThan(puzzle.size)
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThan(puzzle.size)
      }
    }
  })

  it('never places or drops the same word twice', () => {
    const puzzle = generateWordSearch(CATEGORIES[0].name)
    const allWords = [...puzzle.placed.map((p) => p.word), ...puzzle.dropped]
    expect(new Set(allWords).size).toBe(allWords.length)
  })

  it('places most words for a generously sized grid', () => {
    const puzzle = generateWordSearch(CATEGORIES[0].name, Math.random, 16)
    expect(puzzle.placed.length).toBeGreaterThan(0)
  })

  it('falls back to the first category for an unknown name', () => {
    const puzzle = generateWordSearch('does-not-exist')
    expect(puzzle.category).toBe(CATEGORIES[0].name)
  })
})
