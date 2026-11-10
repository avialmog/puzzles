import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { generatePuzzle } from '../../domain/sudoku/generator'
import type { Difficulty, Grid, Puzzle } from '../../domain/sudoku/types'
import { cloneGrid, hashClues } from '../../domain/sudoku/types'
import { getSummary, recordResult } from '../../shared/progress/progressStore'
import styles from './Sudoku.module.css'

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
const MAX_REGENERATE_ATTEMPTS = 3

function boxIndex(r: number, c: number): number {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3)
}

function findConflicts(grid: Grid): Set<string> {
  const conflicts = new Set<string>()
  const rows: Record<string, [number, number][]> = {}
  const cols: Record<string, [number, number][]> = {}
  const boxes: Record<string, [number, number][]> = {}

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c]
      if (v === 0) continue
      const rk = `r${r}-${v}`
      const ck = `c${c}-${v}`
      const bk = `b${boxIndex(r, c)}-${v}`
      ;(rows[rk] ??= []).push([r, c])
      ;(cols[ck] ??= []).push([r, c])
      ;(boxes[bk] ??= []).push([r, c])
    }
  }

  for (const group of [rows, cols, boxes]) {
    for (const cells of Object.values(group)) {
      if (cells.length > 1) {
        for (const [r, c] of cells) conflicts.add(`${r}-${c}`)
      }
    }
  }

  return conflicts
}

function isComplete(grid: Grid): boolean {
  return grid.every((row) => row.every((v) => v !== 0))
}

function generateUnique(difficulty: Difficulty, lastHash: string | null): Puzzle {
  let puzzle = generatePuzzle(difficulty)
  let attempts = 1
  while (lastHash && hashClues(puzzle.clues) === lastHash && attempts < MAX_REGENERATE_ATTEMPTS) {
    puzzle = generatePuzzle(difficulty)
    attempts++
  }
  return puzzle
}

function Sudoku() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [lastHash, setLastHash] = useState<string | null>(null)
  const [puzzle, setPuzzle] = useState<Puzzle>(() => generateUnique('easy', null))
  const [grid, setGrid] = useState<Grid>(() => cloneGrid(puzzle.clues))
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null)
  const [startedAt, setStartedAt] = useState(() => performance.now())
  const [won, setWon] = useState(false)
  const [summary, setSummary] = useState(() => getSummary('sudoku'))

  const conflicts = useMemo(() => findConflicts(grid), [grid])

  function startNewPuzzle(nextDifficulty: Difficulty) {
    const next = generateUnique(nextDifficulty, lastHash)
    setLastHash(hashClues(next.clues))
    setPuzzle(next)
    setGrid(cloneGrid(next.clues))
    setSelected(null)
    setStartedAt(performance.now())
    setWon(false)
  }

  function handleDifficultyChange(next: Difficulty) {
    setDifficulty(next)
    startNewPuzzle(next)
  }

  function handleCellClick(r: number, c: number) {
    if (puzzle.clues[r][c] !== 0 || won) return
    setSelected({ r, c })
  }

  function placeDigit(d: number) {
    if (!selected || won) return
    const { r, c } = selected
    if (puzzle.clues[r][c] !== 0) return

    const next = cloneGrid(grid)
    next[r][c] = d
    setGrid(next)

    if (isComplete(next) && findConflicts(next).size === 0) {
      const elapsedMs = Math.round(performance.now() - startedAt)
      recordResult('sudoku', { completed: true, elapsedMs, details: difficulty })
      setSummary(getSummary('sudoku'))
      setWon(true)
    }
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        ← Home
      </Link>
      <h1>Sudoku</h1>

      <div className={styles.toolbar}>
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            type="button"
            className={`${styles.diffButton} ${d === difficulty ? styles.active : ''}`}
            onClick={() => handleDifficultyChange(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className={`${styles.status} ${won ? styles.won : ''}`}>
        {won ? 'Solved!' : `${puzzle.clueCount} clues`}
      </div>

      <div className={styles.grid}>
        {grid.map((row, r) =>
          row.map((value, c) => {
            const isGiven = puzzle.clues[r][c] !== 0
            const isSelected = selected?.r === r && selected?.c === c
            const hasConflict = conflicts.has(`${r}-${c}`)
            const classNames = [
              styles.cell,
              isGiven ? styles.given : '',
              isSelected ? styles.selected : '',
              hasConflict ? styles.conflict : '',
              c % 3 === 2 && c !== 8 ? styles.boxRight : '',
              r % 3 === 2 && r !== 8 ? styles.boxBottom : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={classNames}
                onClick={() => handleCellClick(r, c)}
              >
                {value !== 0 ? value : ''}
              </button>
            )
          }),
        )}
      </div>

      <div className={styles.numpad}>
        {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => (
          <button key={d} type="button" className={styles.numButton} onClick={() => placeDigit(d)}>
            {d}
          </button>
        ))}
        <button type="button" className={styles.numButton} onClick={() => placeDigit(0)}>
          ⌫
        </button>
      </div>

      <button type="button" className={styles.diffButton} onClick={() => startNewPuzzle(difficulty)}>
        New puzzle
      </button>

      <p className={styles.stats}>
        Solved: {summary.completedCount} · Streak: {summary.currentStreak}
      </p>
    </div>
  )
}

export default Sudoku
