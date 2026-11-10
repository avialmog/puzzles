import { describe, expect, it } from 'vitest'
import { buildCrosswordPrompt } from './promptBuilder'
import type { SolveCluesRequest } from './types'

// . . #        1 2 #
// . . .   -->  3 . 4     (numbers are the derived slot-start positions)
// # . .        # 5 .
const request: SolveCluesRequest = {
  mode: 'clues',
  rows: 3,
  cols: 3,
  black: [
    [false, false, true],
    [false, false, false],
    [true, false, false],
  ],
  across: [
    { number: 1, length: 2, clue: 'Feline pet', row: 0, col: 0 },
    { number: 3, length: 3, clue: 'Opposite of out', row: 1, col: 0 },
    { number: 5, length: 2, clue: 'Afternoon nap', row: 2, col: 1 },
  ],
  down: [
    { number: 1, length: 2, clue: 'Automobile', row: 0, col: 0 },
    { number: 2, length: 3, clue: 'Mythical giant', row: 0, col: 1 },
    { number: 4, length: 2, clue: 'Beverage, briefly', row: 1, col: 2 },
  ],
}

describe('buildCrosswordPrompt', () => {
  const prompt = buildCrosswordPrompt(request)

  it('includes the grid dimensions', () => {
    expect(prompt).toContain('3 rows by 3 columns')
  })

  it('renders the grid diagram with derived slot numbers and black cells', () => {
    expect(prompt).toContain('1 2 #')
    expect(prompt).toContain('3 . 4')
    expect(prompt).toContain('# 5 .')
  })

  it('lists every across clue with its length', () => {
    expect(prompt).toContain('1. Feline pet (2)')
    expect(prompt).toContain('3. Opposite of out (3)')
    expect(prompt).toContain('5. Afternoon nap (2)')
  })

  it('lists every down clue with its length', () => {
    expect(prompt).toContain('1. Automobile (2)')
    expect(prompt).toContain('2. Mythical giant (3)')
    expect(prompt).toContain('4. Beverage, briefly (2)')
  })
})
