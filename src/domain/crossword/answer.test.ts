import { describe, expect, it } from 'vitest'
import { sliceAnswer } from './answer'

const GRID = ['CAT', 'A#O', 'RUN']

describe('sliceAnswer', () => {
  it('reads an across answer', () => {
    expect(sliceAnswer(GRID, { number: 1, direction: 'across', row: 0, col: 0, length: 3 })).toBe('CAT')
  })

  it('reads a down answer', () => {
    expect(sliceAnswer(GRID, { number: 1, direction: 'down', row: 0, col: 0, length: 2 })).toBe('CA')
  })

  it('falls back to "?" for out-of-bounds cells', () => {
    expect(sliceAnswer(GRID, { number: 9, direction: 'across', row: 5, col: 0, length: 2 })).toBe('??')
  })
})
