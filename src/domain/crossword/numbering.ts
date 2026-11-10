import type { CrosswordGrid, CrosswordSlot } from './types'

function isBlack(grid: CrosswordGrid, r: number, c: number): boolean {
  if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) return true
  return grid.black[r][c]
}

function acrossLength(grid: CrosswordGrid, r: number, c: number): number {
  let len = 0
  while (c + len < grid.cols && !grid.black[r][c + len]) len++
  return len
}

function downLength(grid: CrosswordGrid, r: number, c: number): number {
  let len = 0
  while (r + len < grid.rows && !grid.black[r + len][c]) len++
  return len
}

/** Derives standard crossword numbering + across/down slots purely from the black/white cell pattern. */
export function deriveSlots(grid: CrosswordGrid): CrosswordSlot[] {
  const slots: CrosswordSlot[] = []
  let number = 0

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if (grid.black[r][c]) continue

      const startsAcross = isBlack(grid, r, c - 1) && !isBlack(grid, r, c + 1)
      const startsDown = isBlack(grid, r - 1, c) && !isBlack(grid, r + 1, c)

      if (startsAcross || startsDown) {
        number++
        if (startsAcross) slots.push({ number, direction: 'across', row: r, col: c, length: acrossLength(grid, r, c) })
        if (startsDown) slots.push({ number, direction: 'down', row: r, col: c, length: downLength(grid, r, c) })
      }
    }
  }

  return slots
}
