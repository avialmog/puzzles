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
  /** Position of the first letter cell of the answer (not the clue cell itself, for arrow-style grids). */
  row: number
  col: number
}

export interface SolveCluesRequest {
  mode: 'clues'
  rows: number
  cols: number
  black: boolean[][]
  across: SolveCrosswordClue[]
  down: SolveCrosswordClue[]
}

export interface SolveCipherRequest {
  mode: 'cipher'
  rows: number
  cols: number
  black: boolean[][]
  /** Each non-black cell holds a number (typically 1-26); the same number is always the same letter. */
  numbers: number[][]
  /** Pre-given number -> letter mappings, from any "starter" hint cells. */
  knownLetters: Record<number, string>
}

export type SolveCrosswordRequest = SolveCluesRequest | SolveCipherRequest

export interface SolveCrosswordResponse {
  /** `rows` strings, each exactly `cols` characters: '#' for black, uppercase letter otherwise. */
  grid: string[]
}
