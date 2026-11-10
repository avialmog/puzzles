import { describe, expect, it } from 'vitest'
import { countSolutions } from './solver'
import { gradeDifficulty, generateFullGrid, generatePuzzle } from './generator'
import type { Difficulty } from './types'

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

describe('generateFullGrid', () => {
  it('produces a valid complete grid', () => {
    const grid = generateFullGrid()
    expect(isValidSolution(grid)).toBe(true)
  })

  it('produces different grids across calls (randomized)', () => {
    const a = generateFullGrid()
    const b = generateFullGrid()
    expect(a).not.toEqual(b)
  })
})

describe('generatePuzzle', () => {
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

  for (const difficulty of difficulties) {
    it(`generates a uniquely-solvable ${difficulty} puzzle whose clues match the solution`, () => {
      const puzzle = generatePuzzle(difficulty)
      expect(isValidSolution(puzzle.solution)).toBe(true)
      expect(countSolutions(puzzle.clues, 2)).toBe(1)

      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (puzzle.clues[r][c] !== 0) {
            expect(puzzle.clues[r][c]).toBe(puzzle.solution[r][c])
          }
        }
      }
    })
  }

  it('removes at least some cells from the full grid', () => {
    const puzzle = generatePuzzle('medium')
    expect(puzzle.clueCount).toBeLessThan(81)
    expect(puzzle.clueCount).toBeGreaterThan(17)
  })
})

describe('gradeDifficulty', () => {
  it('grades a puzzle solvable by naked/hidden singles alone as easy or medium, not hard', () => {
    const puzzle = generatePuzzle('easy')
    expect(['easy', 'medium']).toContain(gradeDifficulty(puzzle.clues))
  })
})
