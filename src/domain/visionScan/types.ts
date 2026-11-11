export type PuzzleType = 'sudoku' | 'wordSearch' | 'crosswordGrid' | 'crosswordClues' | 'arrowCrossword' | 'codeword'

export interface ReadGridRequestBase {
  puzzleType: PuzzleType
  /** Base64-encoded image bytes, no data: URL prefix. */
  image: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface ReadSudokuRequest extends ReadGridRequestBase {
  puzzleType: 'sudoku'
}
export interface ReadSudokuResponse {
  /** 9x9, 0 for an empty cell. */
  grid: number[][]
}

export interface ReadWordSearchRequest extends ReadGridRequestBase {
  puzzleType: 'wordSearch'
}
export interface ReadWordSearchResponse {
  /** NxN uppercase letters; the model infers N from the image. */
  grid: string[][]
}

export interface ReadCrosswordGridRequest extends ReadGridRequestBase {
  puzzleType: 'crosswordGrid'
}
export interface ReadCrosswordGridResponse {
  rows: number
  cols: number
  /** true = black/blocked cell. */
  black: boolean[][]
}

export interface ReadCrosswordCluesRequest extends ReadGridRequestBase {
  puzzleType: 'crosswordClues'
}
export interface ReadCrosswordCluesResponse {
  across: { number: number; text: string }[]
  down: { number: number; text: string }[]
}

export interface ReadArrowCrosswordRequest extends ReadGridRequestBase {
  puzzleType: 'arrowCrossword'
}
export interface ArrowCellReading {
  row: number
  col: number
  isClueCell: boolean
  /** Only present when isClueCell is true. */
  text?: string
  /** Best-effort guess from the printed arrow glyph; speculative, always user-editable. */
  direction?: 'across' | 'down' | 'both'
}
export interface ReadArrowCrosswordResponse {
  rows: number
  cols: number
  cells: ArrowCellReading[]
}

export interface ReadCodewordRequest extends ReadGridRequestBase {
  puzzleType: 'codeword'
}
export interface ReadCodewordResponse {
  rows: number
  cols: number
  black: boolean[][]
  /** Each non-black cell's printed number. */
  numbers: number[][]
  /** Any given starter letters, keyed by their number. */
  knownLetters: Record<string, string>
}

export type ReadGridRequest =
  | ReadSudokuRequest
  | ReadWordSearchRequest
  | ReadCrosswordGridRequest
  | ReadCrosswordCluesRequest
  | ReadArrowCrosswordRequest
  | ReadCodewordRequest
