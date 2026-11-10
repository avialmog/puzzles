import { describe, expect, it } from 'vitest'
import { distinctNumbers } from './grid'

describe('distinctNumbers', () => {
  it('returns every distinct number in non-black cells, sorted', () => {
    const numbers = [
      [5, 12, 0],
      [12, 3, 7],
      [0, 7, 19],
    ]
    const black = [
      [false, false, true],
      [false, false, false],
      [true, false, false],
    ]
    expect(distinctNumbers(numbers, black)).toEqual([3, 5, 7, 12, 19])
  })

  it('returns an empty array for an all-black grid', () => {
    expect(distinctNumbers([[1]], [[true]])).toEqual([])
  })

  it('ignores whatever number sits under a black cell', () => {
    const numbers = [[0, 1]]
    const black = [[true, false]]
    expect(distinctNumbers(numbers, black)).toEqual([1])
  })
})
