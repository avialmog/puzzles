import { describe, expect, it } from 'vitest'
import { deriveSlots } from './numbering'
import type { CrosswordGrid } from './types'

// . = white, # = black
// . . . # .
// . # . # .
// . . . . .
// . # . # .
// . # . . .
const PATTERN = ['...#.', '.#.#.', '.....', '.#.#.', '.#...']

function gridFromPattern(pattern: string[]): CrosswordGrid {
  const black = pattern.map((row) => row.split('').map((ch) => ch === '#'))
  return { rows: pattern.length, cols: pattern[0].length, black }
}

describe('deriveSlots', () => {
  const grid = gridFromPattern(PATTERN)
  const slots = deriveSlots(grid)

  it('derives the correct number of slots', () => {
    expect(slots).toHaveLength(6)
  })

  it('assigns number 1 to the top-left cell with both across and down', () => {
    const across1 = slots.find((s) => s.number === 1 && s.direction === 'across')
    const down1 = slots.find((s) => s.number === 1 && s.direction === 'down')
    expect(across1).toEqual({ number: 1, direction: 'across', row: 0, col: 0, length: 3 })
    expect(down1).toEqual({ number: 1, direction: 'down', row: 0, col: 0, length: 5 })
  })

  it('assigns number 2 to a down-only slot', () => {
    const slot2 = slots.filter((s) => s.number === 2)
    expect(slot2).toEqual([{ number: 2, direction: 'down', row: 0, col: 2, length: 5 }])
  })

  it('assigns number 3 to a down-only slot at the top-right', () => {
    const slot3 = slots.filter((s) => s.number === 3)
    expect(slot3).toEqual([{ number: 3, direction: 'down', row: 0, col: 4, length: 5 }])
  })

  it('assigns number 4 to the full-width across row', () => {
    const slot4 = slots.filter((s) => s.number === 4)
    expect(slot4).toEqual([{ number: 4, direction: 'across', row: 2, col: 0, length: 5 }])
  })

  it('assigns number 5 to the bottom-right across slot', () => {
    const slot5 = slots.filter((s) => s.number === 5)
    expect(slot5).toEqual([{ number: 5, direction: 'across', row: 4, col: 2, length: 3 }])
  })

  it('never assigns a slot through a black cell', () => {
    for (const slot of slots) {
      for (let i = 0; i < slot.length; i++) {
        const r = slot.direction === 'down' ? slot.row + i : slot.row
        const c = slot.direction === 'across' ? slot.col + i : slot.col
        expect(grid.black[r][c]).toBe(false)
      }
    }
  })

  it('handles a fully open grid as one across and one down slot per row/col', () => {
    const open = gridFromPattern(['...', '...', '...'])
    const openSlots = deriveSlots(open)
    const across = openSlots.filter((s) => s.direction === 'across')
    const down = openSlots.filter((s) => s.direction === 'down')
    expect(across).toHaveLength(3)
    expect(down).toHaveLength(3)
    expect(across.every((s) => s.length === 3)).toBe(true)
    expect(down.every((s) => s.length === 3)).toBe(true)
  })
})
