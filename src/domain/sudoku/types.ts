export type Grid = number[][]

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Puzzle {
  clues: Grid
  solution: Grid
  difficulty: Difficulty
  clueCount: number
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row])
}

export function emptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(0))
}

export function hashClues(grid: Grid): string {
  return grid.map((row) => row.join('')).join('')
}
