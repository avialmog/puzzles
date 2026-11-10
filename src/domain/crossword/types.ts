export type Direction = 'across' | 'down'

export interface CrosswordSlot {
  number: number
  direction: Direction
  row: number
  col: number
  length: number
}

export interface CrosswordGrid {
  rows: number
  cols: number
  /** true = blocked/black cell */
  black: boolean[][]
}

export interface ClueInput {
  number: number
  text: string
}

export interface SolvedCrossword {
  /** Row-major letters; '#' marks a black cell. */
  grid: string[][]
}

export interface SolveCrosswordClue {
  number: number
  length: number
  clue: string
}

export interface SolveCrosswordRequest {
  rows: number
  cols: number
  black: boolean[][]
  across: SolveCrosswordClue[]
  down: SolveCrosswordClue[]
}

export interface SolveCrosswordResponse {
  /** `rows` strings, each exactly `cols` characters: '#' for black, uppercase letter otherwise. */
  grid: string[]
}
