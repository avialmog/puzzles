import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cellBounds, extractCell, inkRatio, warpToSquare, type Point } from '../../shared/imageProcessing/imageProcessing'
import { imageDataToPixelBuffer } from '../../shared/imageProcessing/canvasHelpers'
import { deriveSlots } from '../../domain/crossword/numbering'
import type { CrosswordSlot, SolveCrosswordRequest } from '../../domain/crossword/types'
import scanStyles from '../../shared/scan/ScanUpload.module.css'
import styles from './ScanCrossword.module.css'

const MAX_DISPLAY_WIDTH = 420
const CELL_PX = 30
const MIN_SIZE = 3
const MAX_SIZE = 25
const DEFAULT_SIZE = 15
const BLACK_THRESHOLD = 0.5

type Status = 'upload' | 'corners' | 'review' | 'clues' | 'solving' | 'solved' | 'error'

function cellKey(r: number, c: number): string {
  return `${r}-${c}`
}

function buildClueTemplate(slots: CrosswordSlot[], direction: 'across' | 'down'): string {
  return slots
    .filter((s) => s.direction === direction)
    .map((s) => `${s.number}. (${s.length})`)
    .join('\n')
}

function parseClues(text: string): Map<number, string> {
  const map = new Map<number, string>()
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*(\d+)\.\s*(.*)$/)
    if (!match) continue
    const number = Number(match[1])
    const clueText = match[2].replace(/\(\d+\)\s*$/, '').trim()
    if (clueText) map.set(number, clueText)
  }
  return map
}

function sliceAnswer(grid: string[], slot: CrosswordSlot): string {
  let answer = ''
  for (let i = 0; i < slot.length; i++) {
    const r = slot.direction === 'down' ? slot.row + i : slot.row
    const c = slot.direction === 'across' ? slot.col + i : slot.col
    answer += grid[r]?.[c] ?? '?'
  }
  return answer
}

function ScanCrossword() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [gridSize, setGridSize] = useState(DEFAULT_SIZE)
  const [status, setStatus] = useState<Status>('upload')
  const [corners, setCorners] = useState<Point[]>([])
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null)
  const [black, setBlack] = useState<boolean[][] | null>(null)
  const [acrossText, setAcrossText] = useState('')
  const [downText, setDownText] = useState('')
  const [solvedGrid, setSolvedGrid] = useState<string[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const slots = useMemo(() => {
    if (!black) return []
    return deriveSlots({ rows: gridSize, cols: gridSize, black })
  }, [black, gridSize])

  useEffect(() => {
    if (!displaySize) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = displaySize.width
    canvas.height = displaySize.height
    drawCanvas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displaySize, corners])

  function drawCanvas() {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#6a3bff'
    ctx.fillStyle = '#6a3bff'
    ctx.lineWidth = 2

    corners.forEach((p, i) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillText(String(i + 1), p.x + 8, p.y - 8)
    })

    if (corners.length > 1) {
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y)
      for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i].x, corners[i].y)
      if (corners.length === 4) ctx.closePath()
      ctx.stroke()
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_DISPLAY_WIDTH / img.naturalWidth)
      const displayWidth = Math.round(img.naturalWidth * scale)
      const displayHeight = Math.round(img.naturalHeight * scale)

      imageRef.current = img
      setDisplaySize({ width: displayWidth, height: displayHeight })
      setCorners([])
      setStatus('corners')
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (corners.length >= 4) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height
    setCorners((prev) => [...prev, { x, y }])
  }

  function handleUndoPoint() {
    setCorners((prev) => prev.slice(0, -1))
  }

  function handleResetAll() {
    setCorners([])
    setStatus(displaySize ? 'corners' : 'upload')
    setErrorMessage(null)
    setBlack(null)
    setSolvedGrid(null)
  }

  function handleScan() {
    const canvas = canvasRef.current
    if (!canvas || corners.length !== 4) return

    try {
      const ctx = canvas.getContext('2d')!
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const buffer = imageDataToPixelBuffer(imageData)
      const ordered = corners as [Point, Point, Point, Point]
      const warpSize = gridSize * CELL_PX
      const warped = warpToSquare(buffer, ordered, warpSize)

      const nextBlack: boolean[][] = []
      for (let r = 0; r < gridSize; r++) {
        const row: boolean[] = []
        for (let c = 0; c < gridSize; c++) {
          const bounds = cellBounds(warpSize, gridSize, r, c)
          const cell = extractCell(warped, bounds)
          row.push(inkRatio(cell, 128, 0.05) > BLACK_THRESHOLD)
        }
        nextBlack.push(row)
      }

      setBlack(nextBlack)
      setStatus('review')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  function handleToggleCell(r: number, c: number) {
    if (!black) return
    const next = black.map((row) => [...row])
    next[r][c] = !next[r][c]
    setBlack(next)
  }

  function handleGoToClues() {
    setAcrossText(buildClueTemplate(slots, 'across'))
    setDownText(buildClueTemplate(slots, 'down'))
    setStatus('clues')
  }

  const acrossClues = useMemo(() => parseClues(acrossText), [acrossText])
  const downClues = useMemo(() => parseClues(downText), [downText])
  const missingClues = useMemo(() => {
    const missing: string[] = []
    for (const slot of slots) {
      const map = slot.direction === 'across' ? acrossClues : downClues
      if (!map.has(slot.number)) missing.push(`${slot.number} ${slot.direction}`)
    }
    return missing
  }, [slots, acrossClues, downClues])

  async function handleSolve() {
    if (!black || missingClues.length > 0) return

    setStatus('solving')
    setErrorMessage(null)

    const request: SolveCrosswordRequest = {
      rows: gridSize,
      cols: gridSize,
      black,
      across: slots.filter((s) => s.direction === 'across').map((s) => ({ number: s.number, length: s.length, clue: acrossClues.get(s.number)! })),
      down: slots.filter((s) => s.direction === 'down').map((s) => ({ number: s.number, length: s.length, clue: downClues.get(s.number)! })),
    }

    try {
      const res = await fetch('/.netlify/functions/solve-crossword', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(request),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed with status ${res.status}`)
      setSolvedGrid(data.grid)
      setStatus('solved')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  const numberAt = useMemo(() => {
    const map = new Map<string, number>()
    for (const slot of slots) {
      const key = cellKey(slot.row, slot.col)
      if (!map.has(key)) map.set(key, slot.number)
    }
    return map
  }, [slots])

  return (
    <div className={scanStyles.page}>
      <Link to="/" className={scanStyles.back}>
        ← Home
      </Link>
      <h1>Scan a Crossword</h1>

      {status === 'upload' && (
        <>
          <p className={scanStyles.hint}>Take or upload a photo of a crossword grid.</p>
          <div className={styles.sizeRow}>
            <label htmlFor="cwGridSize">Grid size</label>
            <input
              id="cwGridSize"
              type="number"
              min={MIN_SIZE}
              max={MAX_SIZE}
              className={styles.sizeInput}
              value={gridSize}
              onChange={(e) => setGridSize(Math.max(MIN_SIZE, Math.min(MAX_SIZE, Number(e.target.value) || DEFAULT_SIZE)))}
            />
            <span>x {gridSize}</span>
          </div>
          <label className={scanStyles.fileLabel}>
            Choose photo
            <input type="file" accept="image/*" capture="environment" className={scanStyles.fileInput} onChange={handleFileChange} />
          </label>
        </>
      )}

      {status === 'corners' && (
        <>
          <p className={scanStyles.hint}>
            Tap the 4 corners of the grid in order: top-left, top-right, bottom-right, bottom-left. ({corners.length}/4)
          </p>
          <div className={scanStyles.canvasWrap}>
            <canvas ref={canvasRef} className={scanStyles.canvas} onClick={handleCanvasClick} />
          </div>
          <div className={scanStyles.toolbar}>
            <button type="button" className={scanStyles.button} onClick={handleUndoPoint} disabled={corners.length === 0}>
              Undo point
            </button>
            <label className={scanStyles.button}>
              New photo
              <input type="file" accept="image/*" capture="environment" className={scanStyles.fileInput} onChange={handleFileChange} />
            </label>
            <button type="button" className={`${scanStyles.button} ${scanStyles.primary}`} onClick={handleScan} disabled={corners.length !== 4}>
              Scan
            </button>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <p className={scanStyles.errorBox}>{errorMessage}</p>
          <button type="button" className={scanStyles.button} onClick={handleResetAll}>
            Try again
          </button>
        </>
      )}

      {status === 'review' && black && (
        <>
          <p className={scanStyles.hint}>Tap any cell to toggle it between black and white, then continue.</p>
          <div className={styles.cwGrid} style={{ gridTemplateColumns: `repeat(${gridSize}, 26px)` }}>
            {black.map((row, r) =>
              row.map((isBlack, c) => {
                const number = numberAt.get(cellKey(r, c))
                return (
                  <button
                    key={cellKey(r, c)}
                    type="button"
                    className={`${styles.cwCell} ${isBlack ? styles.black : ''}`}
                    onClick={() => handleToggleCell(r, c)}
                  >
                    {!isBlack && number && <span className={styles.cwNumber}>{number}</span>}
                  </button>
                )
              }),
            )}
          </div>
          <div className={scanStyles.toolbar}>
            <button type="button" className={scanStyles.button} onClick={handleResetAll}>
              Start over
            </button>
            <button type="button" className={`${scanStyles.button} ${scanStyles.primary}`} onClick={handleGoToClues}>
              Continue to clues
            </button>
          </div>
        </>
      )}

      {status === 'clues' && (
        <>
          <p className={scanStyles.hint}>Paste or type each clue after its number. The (length) hints are prefilled.</p>
          <div className={styles.clueColumns}>
            <div className={styles.clueColumn}>
              <h3>Across</h3>
              <textarea className={styles.cluesTextarea} value={acrossText} onChange={(e) => setAcrossText(e.target.value)} />
            </div>
            <div className={styles.clueColumn}>
              <h3>Down</h3>
              <textarea className={styles.cluesTextarea} value={downText} onChange={(e) => setDownText(e.target.value)} />
            </div>
          </div>
          {missingClues.length > 0 && (
            <p className={styles.missingClues}>Missing clue text for: {missingClues.join(', ')}</p>
          )}
          <div className={scanStyles.toolbar}>
            <button type="button" className={scanStyles.button} onClick={() => setStatus('review')}>
              Back to grid
            </button>
            <button
              type="button"
              className={`${scanStyles.button} ${scanStyles.primary}`}
              onClick={handleSolve}
              disabled={missingClues.length > 0}
            >
              Solve
            </button>
          </div>
        </>
      )}

      {status === 'solving' && (
        <>
          <p className={scanStyles.hint}>Solving with AI…</p>
          <div className={styles.spinner} />
        </>
      )}

      {status === 'solved' && solvedGrid && black && (
        <>
          <p className={scanStyles.hint}>Solved!</p>
          <div className={styles.cwGrid} style={{ gridTemplateColumns: `repeat(${gridSize}, 26px)` }}>
            {black.map((row, r) =>
              row.map((isBlack, c) => (
                <div key={cellKey(r, c)} className={`${styles.cwCell} ${styles.letter} ${isBlack ? styles.black : ''}`}>
                  {!isBlack ? solvedGrid[r]?.[c] : ''}
                </div>
              )),
            )}
          </div>
          <div className={styles.answerList}>
            <div>
              <h3>Across</h3>
              <ul>
                {slots
                  .filter((s) => s.direction === 'across')
                  .map((s) => (
                    <li key={`a${s.number}`}>
                      {s.number}. {sliceAnswer(solvedGrid, s)}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <h3>Down</h3>
              <ul>
                {slots
                  .filter((s) => s.direction === 'down')
                  .map((s) => (
                    <li key={`d${s.number}`}>
                      {s.number}. {sliceAnswer(solvedGrid, s)}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
          <div className={scanStyles.toolbar}>
            <button type="button" className={scanStyles.button} onClick={handleResetAll}>
              Scan another
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ScanCrossword
