import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createWorker, PSM } from 'tesseract.js'
import {
  cellBounds,
  extractCell,
  inkRatio,
  warpToSquare,
  type Point,
} from '../../shared/imageProcessing/imageProcessing'
import { imageDataToPixelBuffer, pixelBufferToCanvas, upscaleCanvas } from '../../shared/imageProcessing/canvasHelpers'
import { countSolutions, solveOne } from '../../domain/sudoku/solver'
import type { Grid, Puzzle } from '../../domain/sudoku/types'
import { emptyGrid } from '../../domain/sudoku/types'
import sudokuStyles from '../Sudoku/Sudoku.module.css'
import styles from '../../shared/scan/ScanUpload.module.css'

const MAX_DISPLAY_WIDTH = 420
const WARP_SIZE = 450
const GRID_SIZE = 9
const INK_THRESHOLD = 0.025

type Status = 'upload' | 'corners' | 'scanning' | 'review' | 'error'
type Validation = { kind: 'none' } | { kind: 'unsolvable' } | { kind: 'multiple'; puzzle: Puzzle } | { kind: 'unique'; puzzle: Puzzle }

function parseDigit(text: string): number {
  const match = text.match(/[1-9]/)
  return match ? Number(match[0]) : 0
}

function countClues(grid: Grid): number {
  return grid.reduce((sum, row) => sum + row.filter((v) => v !== 0).length, 0)
}

function ScanSudoku() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [status, setStatus] = useState<Status>('upload')
  const [corners, setCorners] = useState<Point[]>([])
  const [progress, setProgress] = useState(0)
  const [resultGrid, setResultGrid] = useState<Grid | null>(null)
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [validation, setValidation] = useState<Validation>({ kind: 'none' })
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null)

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
    setStatus('corners')
    setErrorMessage(null)
  }

  async function handleScan() {
    const canvas = canvasRef.current
    if (!canvas || corners.length !== 4) return

    setStatus('scanning')
    setProgress(0)
    setErrorMessage(null)

    try {
      const ctx = canvas.getContext('2d')!
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const buffer = imageDataToPixelBuffer(imageData)
      const ordered = corners as [Point, Point, Point, Point]
      const warped = warpToSquare(buffer, ordered, WARP_SIZE)

      const worker = await createWorker('eng')
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_CHAR,
        tessedit_char_whitelist: '123456789',
      })

      const grid = emptyGrid()
      let done = 0

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const bounds = cellBounds(WARP_SIZE, GRID_SIZE, r, c)
          const cell = extractCell(warped, bounds)
          const ratio = inkRatio(cell)

          if (ratio < INK_THRESHOLD) {
            grid[r][c] = 0
          } else {
            const cellCanvas = pixelBufferToCanvas(cell)
            const upscaled = upscaleCanvas(cellCanvas, 4)
            const result = await worker.recognize(upscaled)
            grid[r][c] = parseDigit(result.data.text)
          }

          done++
          setProgress(done)
        }
      }

      await worker.terminate()
      setResultGrid(grid)
      setValidation({ kind: 'none' })
      setStatus('review')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  function handleReviewCellClick(r: number, c: number) {
    setSelected({ r, c })
  }

  function handleReviewDigit(d: number) {
    if (!selected || !resultGrid) return
    const next = resultGrid.map((row) => [...row])
    next[selected.r][selected.c] = d
    setResultGrid(next)
    setValidation({ kind: 'none' })
  }

  function handleValidate() {
    if (!resultGrid) return
    const count = countSolutions(resultGrid, 2)
    if (count === 0) {
      setValidation({ kind: 'unsolvable' })
      return
    }
    const solution = solveOne(resultGrid)!
    const puzzle: Puzzle = {
      clues: resultGrid.map((row) => [...row]),
      solution,
      difficulty: 'hard',
      clueCount: countClues(resultGrid),
    }
    setValidation(count === 1 ? { kind: 'unique', puzzle } : { kind: 'multiple', puzzle })
  }

  function handlePlay() {
    if (validation.kind !== 'unique' && validation.kind !== 'multiple') return
    navigate('/sudoku', { state: { scannedPuzzle: validation.puzzle } })
  }

  return (
    <div className={styles.page}>
      <Link to="/sudoku" className={styles.back}>
        ← Sudoku
      </Link>
      <h1>Scan a Puzzle</h1>

      {status === 'upload' && (
        <>
          <p className={styles.hint}>Take or upload a photo of a Sudoku grid.</p>
          <label className={styles.fileLabel}>
            Choose photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className={styles.fileInput}
              onChange={handleFileChange}
            />
          </label>
        </>
      )}

      {(status === 'corners' || status === 'scanning') && (
        <>
          <p className={styles.hint}>
            Tap the 4 corners of the grid in order: top-left, top-right, bottom-right, bottom-left. ({corners.length}/4)
          </p>
          <div className={styles.canvasWrap}>
            <canvas ref={canvasRef} className={styles.canvas} onClick={handleCanvasClick} />
          </div>
          <div className={styles.toolbar}>
            <button type="button" className={styles.button} onClick={handleUndoPoint} disabled={corners.length === 0 || status === 'scanning'}>
              Undo point
            </button>
            <label className={styles.button}>
              New photo
              <input type="file" accept="image/*" capture="environment" className={styles.fileInput} onChange={handleFileChange} />
            </label>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={handleScan}
              disabled={corners.length !== 4 || status === 'scanning'}
            >
              Scan
            </button>
          </div>

          {status === 'scanning' && (
            <>
              <p className={styles.progressLabel}>Scanning cell {progress} / 81…</p>
              <div className={styles.progressBarTrack}>
                <div className={styles.progressBarFill} style={{ width: `${(progress / 81) * 100}%` }} />
              </div>
            </>
          )}
        </>
      )}

      {status === 'error' && (
        <>
          <p className={styles.errorBox}>Scan failed: {errorMessage}</p>
          <button type="button" className={styles.button} onClick={handleResetAll}>
            Try again
          </button>
        </>
      )}

      {status === 'review' && resultGrid && (
        <>
          <p className={styles.hint}>Check the scanned digits and fix any mistakes before playing.</p>

          <div className={sudokuStyles.grid}>
            {resultGrid.map((row, r) =>
              row.map((value, c) => {
                const isSelected = selected?.r === r && selected?.c === c
                const classNames = [
                  sudokuStyles.cell,
                  isSelected ? sudokuStyles.selected : '',
                  c % 3 === 2 && c !== 8 ? sudokuStyles.boxRight : '',
                  r % 3 === 2 && r !== 8 ? sudokuStyles.boxBottom : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    className={classNames}
                    onClick={() => handleReviewCellClick(r, c)}
                  >
                    {value !== 0 ? value : ''}
                  </button>
                )
              }),
            )}
          </div>

          <div className={sudokuStyles.numpad}>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => (
              <button key={d} type="button" className={sudokuStyles.numButton} onClick={() => handleReviewDigit(d)}>
                {d}
              </button>
            ))}
            <button type="button" className={sudokuStyles.numButton} onClick={() => handleReviewDigit(0)}>
              ⌫
            </button>
          </div>

          {validation.kind === 'unsolvable' && (
            <p className={`${styles.validationBox} ${styles.fail}`}>
              This doesn't look solvable — please check the digits above and try again.
            </p>
          )}
          {validation.kind === 'multiple' && (
            <p className={`${styles.validationBox} ${styles.warn}`}>
              This has more than one valid solution — a digit may have been missed. You can still play it.
            </p>
          )}
          {validation.kind === 'unique' && <p className={styles.validationBox}>Looks good — uniquely solvable!</p>}

          <div className={styles.toolbar}>
            <button type="button" className={styles.button} onClick={handleResetAll}>
              Start over
            </button>
            <button type="button" className={styles.button} onClick={handleValidate}>
              Check
            </button>
            {(validation.kind === 'unique' || validation.kind === 'multiple') && (
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={handlePlay}>
                Play this puzzle
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ScanSudoku
