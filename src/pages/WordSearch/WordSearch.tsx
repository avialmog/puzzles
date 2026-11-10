import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { generateWordSearch } from '../../domain/wordSearch/generator'
import { findMatchingWord, lineCells } from '../../domain/wordSearch/selection'
import type { CellPos } from '../../domain/wordSearch/selection'
import type { WordSearchPuzzle } from '../../domain/wordSearch/types'
import { wordCells } from '../../domain/wordSearch/types'
import { CATEGORIES } from '../../domain/wordSearch/wordList'
import { getSummary, recordResult } from '../../shared/progress/progressStore'
import styles from './WordSearch.module.css'

function cellKey(r: number, c: number): string {
  return `${r}-${c}`
}

function WordSearch() {
  const [category, setCategory] = useState(CATEGORIES[0].name)
  const [puzzle, setPuzzle] = useState<WordSearchPuzzle>(() => generateWordSearch(CATEGORIES[0].name))
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set())
  const [foundCells, setFoundCells] = useState<Set<string>>(new Set())
  const [dragStart, setDragStart] = useState<CellPos | null>(null)
  const [dragEnd, setDragEnd] = useState<CellPos | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startedAt, setStartedAt] = useState(() => performance.now())
  const [summary, setSummary] = useState(() => getSummary('wordSearch'))

  const won = puzzle.placed.length > 0 && foundWords.size === puzzle.placed.length

  const selectedCells = useMemo(() => {
    if (!dragStart || !dragEnd) return []
    return lineCells(dragStart, dragEnd) ?? []
  }, [dragStart, dragEnd])
  const selectedKeys = useMemo(() => new Set(selectedCells.map((cell) => cellKey(cell.r, cell.c))), [selectedCells])

  useEffect(() => {
    if (!isDragging) return
    function handleUp() {
      finishSelection()
    }
    window.addEventListener('pointerup', handleUp)
    return () => window.removeEventListener('pointerup', handleUp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragStart, dragEnd])

  function startNewPuzzle(nextCategory: string) {
    setCategory(nextCategory)
    setPuzzle(generateWordSearch(nextCategory))
    setFoundWords(new Set())
    setFoundCells(new Set())
    setDragStart(null)
    setDragEnd(null)
    setStartedAt(performance.now())
  }

  function handlePointerDown(r: number, c: number) {
    if (won) return
    setIsDragging(true)
    setDragStart({ r, c })
    setDragEnd({ r, c })
  }

  function handlePointerEnter(r: number, c: number) {
    if (!isDragging) return
    setDragEnd({ r, c })
  }

  function finishSelection() {
    setIsDragging(false)
    if (selectedCells.length > 1) {
      const match = findMatchingWord(selectedCells, puzzle.placed)
      if (match && !foundWords.has(match.word)) {
        const nextFound = new Set(foundWords)
        nextFound.add(match.word)
        setFoundWords(nextFound)
        setFoundCells((prev) => {
          const next = new Set(prev)
          for (const cell of selectedCells) next.add(cellKey(cell.r, cell.c))
          return next
        })

        if (nextFound.size === puzzle.placed.length) {
          const elapsedMs = Math.round(performance.now() - startedAt)
          recordResult('wordSearch', { completed: true, elapsedMs, details: category })
          setSummary(getSummary('wordSearch'))
        }
      }
    }
    setDragStart(null)
    setDragEnd(null)
  }

  function handleSolve() {
    const nextCells = new Set<string>()
    for (const p of puzzle.placed) {
      for (const [r, c] of wordCells(p)) nextCells.add(cellKey(r, c))
    }
    setFoundWords(new Set(puzzle.placed.map((p) => p.word)))
    setFoundCells(nextCells)
  }

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        ← Home
      </Link>
      <h1>Word Search</h1>

      <div className={styles.toolbar}>
        {CATEGORIES.map((c) => (
          <button
            key={c.name}
            type="button"
            className={`${styles.catButton} ${c.name === category ? styles.active : ''}`}
            onClick={() => startNewPuzzle(c.name)}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${puzzle.size}, 28px)` }}
        >
          {puzzle.grid.map((row, r) =>
            row.map((letter, c) => {
              const key = cellKey(r, c)
              const classNames = [
                styles.cell,
                selectedKeys.has(key) ? styles.selected : '',
                foundCells.has(key) ? styles.found : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <div
                  key={key}
                  className={classNames}
                  onPointerDown={() => handlePointerDown(r, c)}
                  onPointerEnter={() => handlePointerEnter(r, c)}
                >
                  {letter}
                </div>
              )
            }),
          )}
        </div>

        <div className={styles.wordList}>
          <h3>Find:</h3>
          <ul>
            {puzzle.placed.map((p) => (
              <li key={p.word} className={foundWords.has(p.word) ? styles.found : ''}>
                {p.word}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`${styles.status} ${won ? styles.won : ''}`}>
        {won ? 'All words found!' : `${foundWords.size} / ${puzzle.placed.length} found`}
      </div>

      <button type="button" className={styles.newButton} onClick={() => startNewPuzzle(category)}>
        New puzzle
      </button>
      <button type="button" className={styles.newButton} onClick={handleSolve} disabled={won}>
        Solve
      </button>
      <Link to="/word-search/scan" className={styles.newButton}>
        Scan a puzzle
      </Link>

      <p className={styles.stats}>
        Solved: {summary.completedCount} · Streak: {summary.currentStreak}
      </p>
    </div>
  )
}

export default WordSearch
