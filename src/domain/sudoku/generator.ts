import { countSolutions, logicOnlySolve, solveOne } from './solver'
import type { Difficulty, Grid, Puzzle } from './types'
import { cloneGrid, emptyGrid } from './types'

const DIG_TIME_BUDGET_MS = 200

const TARGET_CLUES: Record<Difficulty, number> = {
  easy: 38,
  medium: 32,
  hard: 26,
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function generateFullGrid(rng: () => number = Math.random): Grid {
  const solved = solveOne(emptyGrid(), rng)
  if (!solved) throw new Error('Failed to generate a full Sudoku grid')
  return solved
}

function digHoles(fullGrid: Grid, targetClues: number, rng: () => number): Grid {
  const grid = cloneGrid(fullGrid)
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as const),
    rng,
  )

  let clueCount = 81
  const start = performance.now()

  for (const [r, c] of positions) {
    if (clueCount <= targetClues) break
    if (performance.now() - start > DIG_TIME_BUDGET_MS) break

    const removed = grid[r][c]
    grid[r][c] = 0
    if (countSolutions(grid, 2) === 1) {
      clueCount--
    } else {
      grid[r][c] = removed
    }
  }

  return grid
}

function countClues(grid: Grid): number {
  return grid.reduce((sum, row) => sum + row.filter((v) => v !== 0).length, 0)
}

export function gradeDifficulty(clues: Grid): Difficulty {
  const { solved } = logicOnlySolve(clues)
  if (!solved) return 'hard'
  const clueCount = countClues(clues)
  if (clueCount >= 34) return 'easy'
  return 'medium'
}

export function generatePuzzle(difficulty: Difficulty, rng: () => number = Math.random): Puzzle {
  const solution = generateFullGrid(rng)
  const clues = digHoles(solution, TARGET_CLUES[difficulty], rng)
  return {
    clues,
    solution,
    difficulty: gradeDifficulty(clues),
    clueCount: countClues(clues),
  }
}
