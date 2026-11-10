import { describe, expect, it } from 'vitest'
import { arrowSlotsToSolveRequest, buildArrowSlots, deriveArrowRun } from './slots'
import type { ArrowClueInput, ArrowGrid } from './types'

// # . .     # = clue cell, . = letter cell
// # . .
// . . .
// . . .
const GRID: ArrowGrid = {
  rows: 4,
  cols: 3,
  isClueCell: [
    [true, false, false],
    [true, false, false],
    [false, false, false],
    [false, false, false],
  ],
}

describe('deriveArrowRun', () => {
  it('finds the across run starting right after the clue cell', () => {
    const run = deriveArrowRun(GRID, { row: 0, col: 0, direction: 'across' })
    expect(run).toEqual({ startRow: 0, startCol: 1, length: 2 })
  })

  it('finds the down run starting right after the clue cell', () => {
    const run = deriveArrowRun(GRID, { row: 1, col: 0, direction: 'down' })
    expect(run).toEqual({ startRow: 2, startCol: 0, length: 2 })
  })

  it('returns null when the adjacent cell is off the grid edge', () => {
    const run = deriveArrowRun(GRID, { row: 0, col: 2, direction: 'across' })
    expect(run).toBeNull()
  })

  it('returns null when the adjacent cell is itself a clue cell', () => {
    const grid: ArrowGrid = { rows: 2, cols: 2, isClueCell: [[true, true], [false, false]] }
    const run = deriveArrowRun(grid, { row: 0, col: 0, direction: 'across' })
    expect(run).toBeNull()
  })
})

describe('buildArrowSlots', () => {
  const clues: ArrowClueInput[] = [
    { row: 0, col: 0, direction: 'across', text: 'Feline pet' },
    { row: 1, col: 0, direction: 'down', text: 'Opposite of out' },
  ]

  it('numbers each valid clue sequentially and records its run position', () => {
    const slots = buildArrowSlots(GRID, clues)
    expect(slots).toEqual([
      { number: 1, direction: 'across', row: 0, col: 1, length: 2, text: 'Feline pet' },
      { number: 2, direction: 'down', row: 2, col: 0, length: 2, text: 'Opposite of out' },
    ])
  })

  it('skips clues whose run is invalid without breaking the numbering of the rest', () => {
    const withInvalid: ArrowClueInput[] = [
      { row: 0, col: 2, direction: 'across', text: 'off the edge, skipped' },
      ...clues,
    ]
    const slots = buildArrowSlots(GRID, withInvalid)
    expect(slots.map((s) => s.text)).toEqual(['Feline pet', 'Opposite of out'])
    expect(slots.map((s) => s.number)).toEqual([1, 2])
  })
})

describe('arrowSlotsToSolveRequest', () => {
  it('marks clue cells as black and carries each slot into the right direction list', () => {
    const slots = buildArrowSlots(GRID, [
      { row: 0, col: 0, direction: 'across', text: 'Feline pet' },
      { row: 1, col: 0, direction: 'down', text: 'Opposite of out' },
    ])
    const request = arrowSlotsToSolveRequest(GRID, slots)

    expect(request.mode).toBe('clues')
    expect(request.black).toEqual(GRID.isClueCell)
    expect(request.across).toEqual([{ number: 1, length: 2, clue: 'Feline pet', row: 0, col: 1 }])
    expect(request.down).toEqual([{ number: 2, length: 2, clue: 'Opposite of out', row: 2, col: 0 }])
  })
})
