import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createWorker, PSM } from 'tesseract.js'
import { cellBounds, extractCell, warpToSquare, type Point } from '../../shared/imageProcessing/imageProcessing'
import {
  detectGridSizeFromCanvas,
  imageDataToPixelBuffer,
  pixelBufferToCanvas,
  upscaleCanvas,
} from '../../shared/imageProcessing/canvasHelpers'
import { solveWordSearch, type SolveResult } from '../../domain/wordSearch/solve'
import { wordCells } from '../../domain/wordSearch/types'
import BackLink from '../../shared/nav/BackLink'
import scanStyles from '../../shared/scan/ScanUpload.module.css'
import styles from './ScanWordSearch.module.css'

const MAX_DISPLAY_WIDTH = 420
const CELL_PX = 40
const MIN_SIZE = 5
const MAX_SIZE = 20
const DEFAULT_SIZE = 12

type Status = 'upload' | 'corners' | 'scanning' | 'review' | 'solved' | 'error'

function parseLetter(text: string): string {
  const match = text.match(/[A-Za-z]/)
  return match ? match[0].toUpperCase() : ''
}

function parseWords(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((w) => w.trim().toUpperCase())
    .filter((w) => w.length > 0)
}

function cellKey(r: number, c: number): string {
  return `${r}-${c}`
}

function ScanWordSearch() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [gridSize, setGridSize] = useState(DEFAULT_SIZE)
  const [status, setStatus] = useState<Status>('upload')
  const [corners, setCorners] = useState<Point[]>([])
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const [letters, setLetters] = useState<string[][] | null>(null)
  const [wordsText, setWordsText] = useState('')
  const [solveResult, setSolveResult] = useState<SolveResult | null>(null)
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
    setLetters(null)
    setSolveResult(null)
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

      const worker = await createWorker('eng')
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_CHAR,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      })

      const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''))
      let done = 0

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const bounds = cellBounds(warpSize, gridSize, r, c)
          const cell = extractCell(warped, bounds)
          const cellCanvas = pixelBufferToCanvas(cell)
          const upscaled = upscaleCanvas(cellCanvas, 4)
          const result = await worker.recognize(upscaled)
          grid[r][c] = parseLetter(result.data.text) || '?'
          done++
          setProgress(done)
        }
      }

      await worker.terminate()
      setLetters(grid)
      setSolveResult(null)
      setStatus('review')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  function handleLetterChange(r: number, c: number, value: string) {
    if (!letters) return
    const next = letters.map((row) => [...row])
    next[r][c] = value.slice(-1).toUpperCase()
    setLetters(next)
  }

  function handleSolve() {
    if (!letters) return
    const words = parseWords(wordsText)
    const result = solveWordSearch(letters, words)
    setSolveResult(result)
    setStatus('solved')
  }

  const foundCellKeys = new Set<string>()
  if (solveResult) {
    for (const placement of solveResult.found) {
      for (const [r, c] of wordCells(placement)) foundCellKeys.add(cellKey(r, c))
    }
  }

  return (
    <div className={scanStyles.page}>
      <BackLink to="/word-search" label={t('wordSearch.title')} />
      <h1>{t('scanWordSearch.title')}</h1>

      {status === 'upload' && (
        <>
          <p className={scanStyles.hint}>{t('scanWordSearch.uploadHint')}</p>
          <div className={styles.sizeRow}>
            <label htmlFor="gridSize">{t('common.gridSize')}</label>
            <input
              id="gridSize"
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
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className={scanStyles.fileInput}
              onChange={handleFileChange}
            />
          </label>
        </>
      )}

      {(status === 'corners' || status === 'scanning') && (
        <>
          <p className={scanStyles.hint}>{t('common.cornersHint', { count: corners.length })}</p>
          {status === 'corners' && (
            <div className={styles.sizeRow}>
              <label htmlFor="gridSizeCorners">{t('common.gridSize')}</label>
              <input
                id="gridSizeCorners"
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
          <p className={scanStyles.errorBox}>{t('common.scanFailed', { message: errorMessage })}</p>
          <button type="button" className={scanStyles.button} onClick={handleResetAll}>
            {t('common.tryAgain')}
          </button>
        </>
      )}

      {(status === 'review' || status === 'solved') && letters && (
        <>
          <p className={scanStyles.hint}>
            {status === 'review' ? t('scanWordSearch.reviewHint') : t('scanWordSearch.solvedHint')}
          </p>

          <div className={styles.letterGrid} style={{ gridTemplateColumns: `repeat(${gridSize}, 28px)` }}>
            {letters.map((row, r) =>
              row.map((letter, c) => {
                const key = cellKey(r, c)
                const isFound = foundCellKeys.has(key)
                if (status === 'solved') {
                  return (
                    <div key={key} className={`${styles.letterCell} ${isFound ? styles.found : ''}`}>
                      {letter}
                    </div>
                  )
                }
                return (
                  <input
                    key={key}
                    className={styles.letterCell}
                    value={letter}
                    maxLength={1}
                    onChange={(e) => handleLetterChange(r, c, e.target.value)}
                  />
                )
              }),
            )}
          </div>

          {status === 'review' && (
            <>
              <textarea
                className={styles.wordsTextarea}
                placeholder={t('scanWordSearch.wordsPlaceholder')}
                value={wordsText}
                onChange={(e) => setWordsText(e.target.value)}
              />
              <div className={scanStyles.toolbar}>
                <button type="button" className={scanStyles.button} onClick={handleResetAll}>
                  {t('common.startOver')}
                </button>
                <button
                  type="button"
                  className={`${scanStyles.button} ${scanStyles.primary}`}
                  onClick={handleSolve}
                  disabled={parseWords(wordsText).length === 0}
                >
                  {t('common.solve')}
                </button>
              </div>
            </>
          )}

          {status === 'solved' && solveResult && (
            <>
              <div className={styles.resultsLayout}>
                <div className={styles.wordList}>
                  <h3>{t('scanWordSearch.foundHeading', { count: solveResult.found.length })}</h3>
                  <ul>
                    {solveResult.found.map((p) => (
                      <li key={p.word} className={styles.found}>
                        {p.word}
                      </li>
                    ))}
                  </ul>
                  {solveResult.notFound.length > 0 && (
                    <>
                      <h3>{t('scanWordSearch.notFoundHeading', { count: solveResult.notFound.length })}</h3>
                      <ul>
                        {solveResult.notFound.map((w) => (
                          <li key={w} className={styles.notFound}>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
              {solveResult.notFound.length > 0 && <p className={scanStyles.hint}>{t('scanWordSearch.notFoundHint')}</p>}
              <div className={scanStyles.toolbar}>
                <button type="button" className={scanStyles.button} onClick={() => setStatus('review')}>
                  {t('scanWordSearch.editLetters')}
                </button>
                <button type="button" className={scanStyles.button} onClick={handleResetAll}>
                  {t('common.startOver')}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default ScanWordSearch
