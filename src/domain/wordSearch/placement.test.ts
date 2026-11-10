import { describe, expect, it } from 'vitest'
import { canPlace, placeWord, tryPlaceWord } from './placement'

function emptyGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array(size).fill(''))
}

describe('canPlace', () => {
  it('allows placing a word in an empty grid', () => {
    const grid = emptyGrid(5)
    expect(canPlace(grid, 5, 'CAT', 0, 0, { dr: 0, dc: 1 })).toBe(true)
  })

  it('rejects a word that runs off the grid edge', () => {
    const grid = emptyGrid(5)
    expect(canPlace(grid, 5, 'CAT', 0, 3, { dr: 0, dc: 1 })).toBe(false)
  })

  it('allows overlapping placement when letters agree', () => {
    const grid = emptyGrid(5)
    placeWord(grid, 'CAT', 0, 0, { dr: 0, dc: 1 })
    expect(canPlace(grid, 5, 'ARM', 0, 1, { dr: 1, dc: 0 })).toBe(true)
  })

  it('rejects overlapping placement when letters conflict', () => {
    const grid = emptyGrid(5)
    placeWord(grid, 'CAT', 0, 0, { dr: 0, dc: 1 })
    expect(canPlace(grid, 5, 'DOG', 0, 0, { dr: 0, dc: 1 })).toBe(false)
  })
})

describe('tryPlaceWord', () => {
  it('returns null when a word cannot fit anywhere', () => {
    const grid = emptyGrid(1)
    expect(tryPlaceWord(grid, 1, 'ELEPHANT', Math.random)).toBeNull()
  })

  it('places a short word into a grid with room for it', () => {
    const grid = emptyGrid(4)
    const result = tryPlaceWord(grid, 4, 'CAT', Math.random)
    expect(result).not.toBeNull()
    expect(result!.word).toBe('CAT')
  })
})
