import type { SolveCluesRequest, SolveCrosswordClue } from '../crossword/types'
import type { ArrowClueInput, ArrowGrid, ArrowSlot } from './types'

export interface ArrowRun {
  startRow: number
  startCol: number
  length: number
}

/**
 * Starting from the cell right after the clue cell (in the clue's direction),
 * finds the run of consecutive non-clue cells that make up the answer.
 * Returns null if the adjacent cell is off-grid or itself a clue cell (no run).
 */
export function deriveArrowRun(grid: ArrowGrid, clue: Pick<ArrowClueInput, 'row' | 'col' | 'direction'>): ArrowRun | null {
  const dr = clue.direction === 'down' ? 1 : 0
  const dc = clue.direction === 'across' ? 1 : 0

  let r = clue.row + dr
  let c = clue.col + dc
  if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) return null
  if (grid.isClueCell[r][c]) return null

  const startRow = r
  const startCol = c
  let length = 0
  while (r >= 0 && r < grid.rows && c >= 0 && c < grid.cols && !grid.isClueCell[r][c]) {
    length++
    r += dr
    c += dc
  }

  return { startRow, startCol, length }
}

/** Builds numbered slots for every clue that has a valid (non-empty) answer run. */
export function buildArrowSlots(grid: ArrowGrid, clues: ArrowClueInput[]): ArrowSlot[] {
  const slots: ArrowSlot[] = []
  let number = 1

  for (const clue of clues) {
    const run = deriveArrowRun(grid, clue)
    if (!run) continue
    slots.push({
      number: number++,
      direction: clue.direction,
      row: run.startRow,
      col: run.startCol,
      length: run.length,
      text: clue.text,
    })
  }

  return slots
}

export function arrowSlotsToSolveRequest(grid: ArrowGrid, slots: ArrowSlot[]): SolveCluesRequest {
  const toClue = (s: ArrowSlot): SolveCrosswordClue => ({ number: s.number, length: s.length, clue: s.text, row: s.row, col: s.col })
  return {
    mode: 'clues',
    rows: grid.rows,
    cols: grid.cols,
    black: grid.isClueCell,
    across: slots.filter((s) => s.direction === 'across').map(toClue),
    down: slots.filter((s) => s.direction === 'down').map(toClue),
  }
}
