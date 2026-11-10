import type { PlacedWord } from './types'
import { wordCells } from './types'

export interface CellPos {
  r: number
  c: number
}

function sign(n: number): number {
  return n === 0 ? 0 : n > 0 ? 1 : -1
}

export function lineCells(start: CellPos, end: CellPos): CellPos[] | null {
  const dr = end.r - start.r
  const dc = end.c - start.c
  if (dr === 0 && dc === 0) return [start]
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null

  const stepR = sign(dr)
  const stepC = sign(dc)
  const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1
  return Array.from({ length }, (_, i) => ({ r: start.r + stepR * i, c: start.c + stepC * i }))
}

export function matchesPlacedWord(cells: CellPos[], placed: PlacedWord): boolean {
  const target = wordCells(placed).map(([r, c]) => ({ r, c }))
  if (cells.length !== target.length) return false

  const sameForward = cells.every((cell, i) => cell.r === target[i].r && cell.c === target[i].c)
  const sameReverse = cells.every((cell, i) => cell.r === target[target.length - 1 - i].r && cell.c === target[target.length - 1 - i].c)
  return sameForward || sameReverse
}

export function findMatchingWord(cells: CellPos[], placedWords: PlacedWord[]): PlacedWord | null {
  return placedWords.find((p) => matchesPlacedWord(cells, p)) ?? null
}
