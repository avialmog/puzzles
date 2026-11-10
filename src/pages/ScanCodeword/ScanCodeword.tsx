import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createWorker, PSM } from 'tesseract.js'
import { cellBounds, extractCell, inkRatio, warpToSquare, type Point } from '../../shared/imageProcessing/imageProcessing'
import {
  detectGridSizeFromCanvas,
  imageDataToPixelBuffer,
  pixelBufferToCanvas,
  upscaleCanvas,
} from '../../shared/imageProcessing/canvasHelpers'
import { distinctNumbers } from '../../domain/codeword/grid'
import type { SolveCipherRequest } from '../../domain/crossword/types'
import BackLink from '../../shared/nav/BackLink'
import scanStyles from '../../shared/scan/ScanUpload.module.css'
import styles from './ScanCodeword.module.css'

const MAX_DISPLAY_WIDTH = 420
const CELL_PX = 40
const MIN_SIZE = 5
const MAX_SIZE = 20
const DEFAULT_SIZE = 13
const BLACK_THRESHOLD = 0.5

type Status = 'upload' | 'corners' | 'scanning' | 'review' | 'known' | 'solving' | 'solved' | 'error'

function cellKey(r: number, c: number): string {
  return `${r}-${c}`
}

function parseNumber(text: string): number {
  const match = text.match(/\d+/)
  return match ? Number(match[0]) : 0
}

function ScanCodeword() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [gridSize, setGridSize] = useState(DEFAULT_SIZE)
  const [status, setStatus] = useState<Status>('upload')
  const [corners, setCorners] = useState<Point[]>([])
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const [black, setBlack] = useState<boolean[][] | null>(null)
  const [numbers, setNumbers] = useState<number[][] | null>(null)
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null)
  const [knownLetters, setKnownLetters] = useState<Map<number, string>>(new Map())
  const [solvedGrid, setSolvedGrid] = useState<string[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
    const next = [...corners, { x, y }]
    setCorners(next)

    if (next.length === 4) {
      const detected = detectGridSizeFromCanvas(canvas, next as [Point, Point, Point, Point], MIN_SIZE, MAX_SIZE)
      if (detected) setGridSize(detected)
    }
  }

  function handleUndoPoint() {
    setCorners((prev) => prev.slice(0, -1))
  }

  function handleResetAll() {
    setCorners([])
    setStatus(displaySize ? 'corners' : 'upload')
    setErrorMessage(null)
    setBlack(null)
    setNumbers(null)
    setSelectedCell(null)
    setKnownLetters(new Map())
    setSolvedGrid(null)
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
      const warpSize = gridSize * CELL_PX
      const warped = warpToSquare(buffer, ordered, warpSize)

      const nextBlack: boolean[][] = []
      for (let r = 0; r < gridSize; r++) {
        const blackRow: boolean[] = []
        for (let c = 0; c < gridSize; c++) {
          const bounds = cellBounds(warpSize, gridSize, r, c)
          const cell = extractCell(warped, bounds)
          blackRow.push(inkRatio(cell, 128, 0.05) > BLACK_THRESHOLD)
        }
        nextBlack.push(blackRow)
      }

      const worker = await createWorker('eng')
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_WORD,
        tessedit_char_whitelist: '0123456789',
      })

      const nextNumbers: number[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(0))
      let done = 0

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (nextBlack[r][c]) continue
          const bounds = cellBounds(warpSize, gridSize, r, c)
          const cell = extractCell(warped, bounds)
          const cellCanvas = pixelBufferToCanvas(cell)
          const upscaled = upscaleCanvas(cellCanvas, 4)
          const result = await worker.recognize(upscaled)
          nextNumbers[r][c] = parseNumber(result.data.text)
          done++
          setProgress(done)
        }
      }

      await worker.terminate()
      setBlack(nextBlack)
      setNumbers(nextNumbers)
      setStatus('review')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  function handleSelectCell(r: number, c: number) {
    setSelectedCell({ r, c })
  }

  function handleToggleSelectedBlack() {
    if (!selectedCell || !black) return
    const { r, c } = selectedCell
    const nextBlack = black.map((row) => [...row])
    nextBlack[r][c] = !nextBlack[r][c]
    setBlack(nextBlack)
  }

  function handleSelectedNumberChange(value: string) {
    if (!selectedCell || !numbers) return
    const { r, c } = selectedCell
    const next = numbers.map((row) => [...row])
    next[r][c] = Number(value.replace(/\D/g, '').slice(0, 2)) || 0
    setNumbers(next)
  }

  const numberList = useMemo(() => (black && numbers ? distinctNumbers(numbers, black) : []), [black, numbers])

  function handleGoToKnown() {
    setStatus('known')
  }

  function handleKnownLetterChange(num: number, value: string) {
    const letter = value.replace(/[^A-Za-z]/g, '').slice(-1).toUpperCase()
    const next = new Map(knownLetters)
    if (letter) next.set(num, letter)
    else next.delete(num)
    setKnownLetters(next)
  }

  async function handleSolve() {
    if (!black || !numbers) return

    setStatus('solving')
    setErrorMessage(null)

    const request: SolveCipherRequest = {
      mode: 'cipher',
      rows: gridSize,
      cols: gridSize,
      black,
      numbers,
      knownLetters: Object.fromEntries(knownLetters),
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

  const selectedValue = selectedCell && numbers ? numbers[selectedCell.r][selectedCell.c] : null
  const selectedIsBlack = selectedCell && black ? black[selectedCell.r][selectedCell.c] : false

  return (
    <div className={scanStyles.page}>
      <BackLink to="/" label={t('common.home')} />
      <h1>{t('scanCodeword.title')}</h1>

      {status === 'upload' && (
        <>
          <p className={scanStyles.hint}>{t('scanCodeword.uploadHint')}</p>
          <div className={styles.sizeRow}>
            <label htmlFor="cdGridSize">{t('common.gridSize')}</label>
            <input
              id="cdGridSize"
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
            {t('common.choosePhoto')}
            <input type="file" accept="image/*" capture="environment" className={scanStyles.fileInput} onChange={handleFileChange} />
          </label>
        </>
      )}

      {(status === 'corners' || status === 'scanning') && (
        <>
          <p className={scanStyles.hint}>{t('common.cornersHint', { count: corners.length })}</p>
          {status === 'corners' && (
            <div className={styles.sizeRow}>
              <label htmlFor="cdGridSizeCorners">{t('common.gridSize')}</label>
              <input
                id="cdGridSizeCorners"
                type="number"
                min={MIN_SIZE}
                max={MAX_SIZE}
                className={styles.sizeInput}
                value={gridSize}
                onChange={(e) => setGridSize(Math.max(MIN_SIZE, Math.min(MAX_SIZE, Number(e.target.value) || DEFAULT_SIZE)))}
              />
              <span>x {gridSize}</span>
            </div>
          )}
          <div className={scanStyles.canvasWrap}>
            <canvas ref={canvasRef} className={scanStyles.canvas} onClick={handleCanvasClick} />
          </div>
          <div className={scanStyles.toolbar}>
            <button type="button" className={scanStyles.button} onClick={handleUndoPoint} disabled={corners.length === 0 || status === 'scanning'}>
              {t('common.undoPoint')}
            </button>
            <label className={scanStyles.button}>
              {t('common.newPhoto')}
              <input type="file" accept="image/*" capture="environment" className={scanStyles.fileInput} onChange={handleFileChange} />
            </label>
            <button
              type="button"
              className={`${scanStyles.button} ${scanStyles.primary}`}
              onClick={handleScan}
              disabled={corners.length !== 4 || status === 'scanning'}
            >
              {t('common.scan')}
            </button>
          </div>

          {status === 'scanning' && (
            <>
              <p className={scanStyles.progressLabel}>
                {t('common.scanningProgress', { current: progress, total: gridSize * gridSize })}
              </p>
              <div className={scanStyles.progressBarTrack}>
                <div className={scanStyles.progressBarFill} style={{ width: `${(progress / (gridSize * gridSize)) * 100}%` }} />
              </div>
            </>
          )}
        </>
      )}

      {status === 'error' && (
        <>
          <p className={scanStyles.errorBox}>{errorMessage}</p>
          <button type="button" className={scanStyles.button} onClick={handleResetAll}>
            {t('common.tryAgain')}
          </button>
        </>
      )}

      {status === 'review' && black && numbers && (
        <>
          <p className={scanStyles.hint}>{t('scanCodeword.reviewHint')}</p>
          <div className={styles.cwGrid} style={{ gridTemplateColumns: `repeat(${gridSize}, 30px)` }}>
            {black.map((row, r) =>
              row.map((isBlack, c) => {
                const key = cellKey(r, c)
                const isSelected = selectedCell?.r === r && selectedCell?.c === c
                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.cwCell} ${isBlack ? styles.black : ''} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleSelectCell(r, c)}
                  >
                    {!isBlack ? numbers[r][c] : ''}
                  </button>
                )
              }),
            )}
          </div>

          {selectedCell && (
            <div className={styles.editorBox}>
              <button type="button" className={scanStyles.button} onClick={handleToggleSelectedBlack}>
                {selectedIsBlack ? t('scanCodeword.markWhite') : t('scanCodeword.markBlack')}
              </button>
              {!selectedIsBlack && (
                <label>
                  {t('scanCodeword.numberInCell')}
                  <input value={selectedValue ?? ''} onChange={(e) => handleSelectedNumberChange(e.target.value)} />
                </label>
              )}
            </div>
          )}

          <div className={scanStyles.toolbar}>
            <button type="button" className={scanStyles.button} onClick={handleResetAll}>
              {t('common.startOver')}
            </button>
            <button type="button" className={`${scanStyles.button} ${scanStyles.primary}`} onClick={handleGoToKnown}>
              {t('scanCodeword.continueToKnown')}
            </button>
          </div>
        </>
      )}

      {status === 'known' && (
        <>
          <p className={scanStyles.hint}>{t('scanCodeword.knownLettersHint')}</p>
          <div className={styles.legend}>
            {numberList.map((num) => (
              <div key={num} className={styles.legendEntry}>
                <span>{num} =</span>
                <input
                  maxLength={1}
                  value={knownLetters.get(num) ?? ''}
                  onChange={(e) => handleKnownLetterChange(num, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className={scanStyles.toolbar}>
            <button type="button" className={scanStyles.button} onClick={() => setStatus('review')}>
              {t('common.backToGrid')}
            </button>
            <button type="button" className={`${scanStyles.button} ${scanStyles.primary}`} onClick={handleSolve}>
              {t('common.solve')}
            </button>
          </div>
        </>
      )}

      {status === 'solving' && (
        <>
          <p className={scanStyles.hint}>{t('common.solvingWithAi')}</p>
          <div className={styles.spinner} />
        </>
      )}

      {status === 'solved' && solvedGrid && black && (
        <>
          <p className={scanStyles.hint}>{t('common.solved')}</p>
          <div className={styles.cwGrid} style={{ gridTemplateColumns: `repeat(${gridSize}, 30px)` }}>
            {black.map((row, r) =>
              row.map((isBlack, c) => (
                <div key={cellKey(r, c)} className={`${styles.cwCell} ${styles.letter} ${isBlack ? styles.black : ''}`}>
                  {!isBlack ? solvedGrid[r]?.[c] : ''}
                </div>
              )),
            )}
          </div>
          <div className={scanStyles.toolbar}>
            <button type="button" className={scanStyles.button} onClick={handleResetAll}>
              {t('common.scanAnother')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ScanCodeword
