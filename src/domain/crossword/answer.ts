import type { CrosswordSlot } from './types'

export function sliceAnswer(grid: string[], slot: CrosswordSlot): string {
  let answer = ''
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === 'down' ? slot.row + i : slot.row
    const c = slot.direction === 'across' ? slot.col + i : slot.col
    answer += grid[r]?.[c] ?? '?'
  }
  return answer
}
