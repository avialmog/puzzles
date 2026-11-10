import type { CrosswordSlot, Direction } from '../crossword/types'

export interface ArrowGrid {
  rows: number
  cols: number
  /** true = this cell holds a printed clue (not a letter to solve) */
  isClueCell: boolean[][]
}

export interface ArrowClueInput {
  row: number
  col: number
  direction: Direction
  text: string
}

export interface ArrowSlot extends CrosswordSlot {
  text: string
}
