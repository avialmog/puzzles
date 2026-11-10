import { describe, expect, it } from 'vitest'
import { findWordInGrid, solveWordSearch } from './solve'

const GRID = ['CATS', 'XOXO', 'XOXO', 'SDOG'].map((row) => row.split(''))

describe('findWordInGrid', () => {
  it('finds a word placed left-to-right', () => {
    const result = findWordInGrid(GRID, 'CATS')
    expect(result).toEqual({ word: 'CATS', row: 0, col: 0, dir: { dr: 0, dc: 1 } })
  })

  it('finds a word placed top-to-bottom', () => {
    // Column 0 reads C,X,X,S top-to-bottom - not a real word; test a vertical word instead.
    const vertical = ['C', 'A', 'T'].map((ch) => [ch])
    const result = findWordInGrid(vertical, 'CAT')
    expect(result).toEqual({ word: 'CAT', row: 0, col: 0, dir: { dr: 1, dc: 0 } })
  })

  it('finds a word placed right-to-left (reversed)', () => {
    const result = findWordInGrid(GRID, 'GOD')
    expect(result).toEqual({ word: 'GOD', row: 3, col: 3, dir: { dr: 0, dc: -1 } })
  })

  it('finds a diagonal word', () => {
    const grid = [
      ['A', 'x', 'x'],
      ['x', 'B', 'x'],
      ['x', 'x', 'C'],
    ]
    const result = findWordInGrid(grid, 'ABC')
    expect(result).toEqual({ word: 'ABC', row: 0, col: 0, dir: { dr: 1, dc: 1 } })
  })

  it('returns null for a word that is not present', () => {
    expect(findWordInGrid(GRID, 'ZEBRA')).toBeNull()
  })

  it('returns null for an empty grid', () => {
    expect(findWordInGrid([], 'CAT')).toBeNull()
  })
})

describe('solveWordSearch', () => {
  it('separates found and not-found words', () => {
    const result = solveWordSearch(GRID, ['CATS', 'GOD', 'ZEBRA'])
    expect(result.found.map((p) => p.word)).toEqual(['CATS', 'GOD'])
    expect(result.notFound).toEqual(['ZEBRA'])
  })
})
