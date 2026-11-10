export interface Direction {
  dr: number
  dc: number
}

export interface PlacedWord {
  word: string
  row: number
  col: number
  dir: Direction
}

export interface WordSearchPuzzle {
  grid: string[][]
  size: number
  placed: PlacedWord[]
  dropped: string[]
  category: string
}

export const DIRECTIONS: Direction[] = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 0 },
  { dr: -1, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
]

export function wordCells(placed: PlacedWord): Array<[number, number]> {
  const cells: Array<[number, number]> = []
  for (let i = 0; i < placed.word.length; i++) {
    cells.push([placed.row + placed.dir.dr * i, placed.col + placed.dir.dc * i])
  }
  return cells
}
