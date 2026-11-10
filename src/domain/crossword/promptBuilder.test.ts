import { describe, expect, it } from 'vitest'
import { buildCrosswordPrompt } from './promptBuilder'
import type { SolveCrosswordRequest } from './types'

// . . #        1 2 #
// . . .   -->  3 . 4     (numbers are the derived slot-start positions)
// # . .        # 5 .
const request: SolveCrosswordRequest = {
  rows: 3,
  cols: 3,
  black: [
    [false, false, true],
    [false, false, false],
    [true, false, false],
  ],
  across: [
    { number: 1, length: 2, clue: 'Feline pet' },
    { number: 3, length: 3, clue: 'Opposite of out' },
    { number: 5, length: 2, clue: 'Afternoon nap' },
  ],
  down: [
    { number: 1, length: 2, clue: 'Automobile' },
    { number: 2, length: 3, clue: 'Mythical giant' },
    { number: 4, length: 2, clue: 'Beverage, briefly' },
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
