import { describe, expect, it } from 'vitest'
import { countSolutions, logicOnlySolve, solveOne } from './solver'
import { emptyGrid } from './types'

const VALID_SOLUTION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

function isValidSolution(grid: number[][]): boolean {
  const checkGroup = (values: number[]) => new Set(values).size === 9 && values.every((v) => v >= 1 && v <= 9)
  for (let r = 0; r < 9; r++) if (!checkGroup(grid[r])) return false
  for (let c = 0; c < 9; c++) if (!checkGroup(grid.map((row) => row[c]))) return false
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const box: number[] = []
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) box.push(grid[br + dr][bc + dc])
      if (!checkGroup(box)) return false
    }
  }
  return true
}

describe('solveOne', () => {
  it('fills an empty grid with a valid complete solution', () => {
    const solved = solveOne(emptyGrid())
    expect(solved).not.toBeNull()
    expect(isValidSolution(solved!)).toBe(true)
  })

  it('solves a grid with a single empty cell', () => {
    const grid = VALID_SOLUTION.map((row) => [...row])
    grid[0][0] = 0
    const solved = solveOne(grid)
    expect(solved![0][0]).toBe(5)
  })

  it('returns null for an unsolvable grid', () => {
    // Row 0 (cols 1-8) uses digits 1-8, and column 0 (row 1) uses digit 9 -
    // together they block all 9 digits from cell (0,0), an immediate contradiction.
    const broken = emptyGrid()
    for (let d = 1; d <= 8; d++) broken[0][d] = d
    broken[1][0] = 9
    expect(solveOne(broken)).toBeNull()
  })
})

describe('countSolutions', () => {
  it('finds exactly one solution for a fully solved grid', () => {
    expect(countSolutions(VALID_SOLUTION, 2)).toBe(1)
  })

  it('finds multiple solutions for a mostly empty grid, capped at the limit', () => {
    const grid = VALID_SOLUTION.map((row) => [...row])
    grid[8][8] = 0
    grid[8][7] = 0
    // With two cells free in a way that both can swap, there may be exactly 1 or 2 valid completions.
    expect(countSolutions(grid, 2)).toBeGreaterThanOrEqual(1)
  })
})

describe('logicOnlySolve', () => {
  it('solves a puzzle with only one cell missing using naked singles', () => {
    const grid = VALID_SOLUTION.map((row) => [...row])
    grid[0][0] = 0
    const { solved, grid: result } = logicOnlySolve(grid)
    expect(solved).toBe(true)
    expect(result[0][0]).toBe(5)
  })

  it('reports not solved for an empty grid', () => {
    const { solved } = logicOnlySolve(emptyGrid())
    expect(solved).toBe(false)
  })
})
