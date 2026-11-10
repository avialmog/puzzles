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
import { sliceAnswer } from '../../domain/crossword/answer'
import { arrowSlotsToSolveRequest, buildArrowSlots } from '../../domain/crosswordArrow/slots'
import type { ArrowClueInput, ArrowGrid } from '../../domain/crosswordArrow/types'
import BackLink from '../../shared/nav/BackLink'
import scanStyles from '../../shared/scan/ScanUpload.module.css'
import styles from './ScanArrowCrossword.module.css'

const MAX_DISPLAY_WIDTH = 420
const CELL_PX = 30
const MIN_SIZE = 3
const MAX_SIZE = 25
const DEFAULT_SIZE = 10
const CLUE_INK_THRESHOLD = 0.04

type Status = 'upload' | 'corners' | 'scanning' | 'review' | 'clues' | 'solving' | 'solved' | 'error'

interface ClueText {
  across: string
  down: string
}

function cellKey(r: number, c: number): string {
  return `${r}-${c}`
}

function ScanArrowCrossword() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [gridSize, setGridSize] = useState(DEFAULT_SIZE)
  const [status, setStatus] = useState<Status>('upload')
  const [corners, setCorners] = useState<Point[]>([])
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null)
  const [isClueCell, setIsClueCell] = useState<boolean[][] | null>(null)
  const [clueOcrText, setClueOcrText] = useState<Map<string, string>>(new Map())
  const [progress, setProgress] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [clueMap, setClueMap] = useState<Map<string, ClueText>>(new Map())
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null)
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
    setIsClueCell(null)
    setClueOcrText(new Map())
    setClueMap(new Map())
    setSelectedCell(null)
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

      const next: boolean[][] = []
      for (let r = 0; r < gridSize; r++) {
        const row: boolean[] = []
        for (let c = 0; c < gridSize; c++) {
          const bounds = cellBounds(warpSize, gridSize, r, c)
          const cell = extractCell(warped, bounds)
          row.push(inkRatio(cell, 128, 0.05) > CLUE_INK_THRESHOLD)
        }
        next.push(row)
      }

      const clueCellCount = next.flat().filter(Boolean).length
      setProgressTotal(clueCellCount)

      const worker = await createWorker('eng')
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })

      const ocrText = new Map<string, string>()
      let done = 0

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (!next[r][c]) continue
          const bounds = cellBounds(warpSize, gridSize, r, c)
          const cell = extractCell(warped, bounds)
          const cellCanvas = pixelBufferToCanvas(cell)
          const upscaled = upscaleCanvas(cellCanvas, 4)
          const result = await worker.recognize(upscaled)
          const text = result.data.text.replace(/\s+/g, ' ').trim()
          if (text) ocrText.set(cellKey(r, c), text)
          done++
          setProgress(done)
        }
      }

      await worker.terminate()
      setIsClueCell(next)
      setClueOcrText(ocrText)
      setStatus('review')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  function handleToggleCell(r: number, c: number) {
    if (!isClueCell) return
    const next = isClueCell.map((row) => [...row])
    next[r][c] = !next[r][c]
    setIsClueCell(next)
  }

  function handleGoToClues() {
    if (!isClueCell) return
    const next = new Map(clueMap)
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (isClueCell[r][c] && !next.has(cellKey(r, c))) {
          next.set(cellKey(r, c), { across: clueOcrText.get(cellKey(r, c)) ?? '', down: '' })
        }
      }
    }
    setClueMap(next)
    setStatus('clues')
  }

  function handleSelectClueCell(r: number, c: number) {
    setSelectedCell({ r, c })
  }

  function handleClueTextChange(direction: 'across' | 'down', value: string) {
    if (!selectedCell) return
    const key = cellKey(selectedCell.r, selectedCell.c)
    const next = new Map(clueMap)
    const current = next.get(key) ?? { across: '', down: '' }
    next.set(key, { ...current, [direction]: value })
    setClueMap(next)
  }

  const grid: ArrowGrid | null = isClueCell ? { rows: gridSize, cols: gridSize, isClueCell } : null

  const clueInputs: ArrowClueInput[] = useMemo(() => {
    const inputs: ArrowClueInput[] = []
    for (const [key, text] of clueMap) {
      const [r, c] = key.split('-').map(Number)
      if (text.across.trim()) inputs.push({ row: r, col: c, direction: 'across', text: text.across.trim() })
      if (text.down.trim()) inputs.push({ row: r, col: c, direction: 'down', text: text.down.trim() })
    }
    return inputs
  }, [clueMap])

  const slots = useMemo(() => (grid ? buildArrowSlots(grid, clueInputs) : []), [grid, clueInputs])

  const emptyClueCells = useMemo(() => {
    const empty: string[] = []
    for (const [key, text] of clueMap) {
      if (!text.across.trim() && !text.down.trim()) empty.push(key)
    }
    return empty
  }, [clueMap])

  async function handleSolve() {
    if (!grid || emptyClueCells.length > 0 || slots.length === 0) return

    setStatus('solving')
    setErrorMessage(null)

    const request = arrowSlotsToSolveRequest(grid, slots)

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

  const selectedKey = selectedCell ? cellKey(selectedCell.r, selectedCell.c) : null
  const selectedText = selectedKey ? (clueMap.get(selectedKey) ?? { across: '', down: '' }) : null

  return (
    <div className={scanStyles.page}>
      <BackLink to="/" label={t('common.home')} />
      <h1>{t('scanArrowCrossword.title')}</h1>

      {status === 'upload' && (
        <>
          <p className={scanStyles.hint}>{t('scanArrowCrossword.uploadHint')}</p>
          <div className={styles.sizeRow}>
            <label htmlFor="awGridSize">{t('common.gridSize')}</label>
            <input
              id="awGridSize"
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
              <label htmlFor="awGridSizeCorners">{t('common.gridSize')}</label>
              <input
                id="awGridSizeCorners"
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
              <p className={scanStyles.progressLabel}>{t('common.scanningProgress', { current: progress, total: progressTotal })}</p>
              <div className={scanStyles.progressBarTrack}>
                <div
                  className={scanStyles.progressBarFill}
                  style={{ width: `${progressTotal === 0 ? 100 : (progress / progressTotal) * 100}%` }}
                />
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

      {status === 'review' && isClueCell && (
        <>
          <p className={scanStyles.hint}>{t('scanArrowCrossword.reviewHint')}</p>
          <div className={styles.awGrid} style={{ gridTemplateColumns: `repeat(${gridSize}, 26px)` }}>
            {isClueCell.map((row, r) =>
              row.map((isClue, c) => (
                <button
                  key={cellKey(r, c)}
                  type="button"
                  className={`${styles.awCell} ${isClue ? styles.clue : ''}`}
                  onClick={() => handleToggleCell(r, c)}
                />
              )),
            )}
          </div>
          <div className={scanStyles.toolbar}>
            <button type="button" className={scanStyles.button} onClick={handleResetAll}>
              {t('common.startOver')}
            </button>
            <button type="button" className={`${scanStyles.button} ${scanStyles.primary}`} onClick={handleGoToClues}>
              {t('common.continueToClues')}
            </button>
          </div>
        </>
      )}

      {status === 'clues' && isClueCell && (
        <>
          <p className={scanStyles.hint}>{t('scanArrowCrossword.cluesHint')}</p>
          <div className={styles.awGrid} style={{ gridTemplateColumns: `repeat(${gridSize}, 26px)` }}>
            {isClueCell.map((row, r) =>
              row.map((isClue, c) => {
                const key = cellKey(r, c)
                const filled = isClue && Boolean(clueMap.get(key)?.across || clueMap.get(key)?.down)
                return (
                  <button
                    key={key}
                    type="button"
                    className={[
                      styles.awCell,
                      isClue ? styles.clue : styles.letter,
                      selectedKey === key ? styles.selected : '',
                      filled ? styles.filled : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={!isClue}
                    onClick={() => handleSelectClueCell(r, c)}
                  />
                )
              }),
            )}
          </div>

          {selectedCell && selectedText && (
            <div className={styles.editorBox}>
              <label>
                {t('scanArrowCrossword.acrossClueLabel')}
                <input value={selectedText.across} onChange={(e) => handleClueTextChange('across', e.target.value)} />
              </label>
              <label>
                {t('scanArrowCrossword.downClueLabel')}
                <input value={selectedText.down} onChange={(e) => handleClueTextChange('down', e.target.value)} />
              </label>
            </div>
          )}

          {emptyClueCells.length > 0 && (
            <p className={styles.missingClues}>{t('scanArrowCrossword.missingClues', { count: emptyClueCells.length })}</p>
          )}

          <div className={scanStyles.toolbar}>
            <button type="button" className={scanStyles.button} onClick={() => setStatus('review')}>
              {t('common.backToGrid')}
            </button>
            <button
              type="button"
              className={`${scanStyles.button} ${scanStyles.primary}`}
              onClick={handleSolve}
              disabled={emptyClueCells.length > 0 || slots.length === 0}
            >
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

      {status === 'solved' && solvedGrid && isClueCell && (
        <>
          <p className={scanStyles.hint}>{t('common.solved')}</p>
          <div className={styles.awGrid} style={{ gridTemplateColumns: `repeat(${gridSize}, 26px)` }}>
            {isClueCell.map((row, r) =>
              row.map((isClue, c) => (
                <div key={cellKey(r, c)} className={`${styles.awCell} ${styles.letter} ${isClue ? styles.clue : ''}`}>
                  {!isClue ? solvedGrid[r]?.[c] : ''}
                </div>
              )),
            )}
          </div>
          <div className={styles.answerList}>
            <div>
              <h3>{t('common.across')}</h3>
              <ul>
                {slots
                  .filter((s) => s.direction === 'across')
                  .map((s) => (
                    <li key={`a${s.number}-${s.row}-${s.col}`}>{sliceAnswer(solvedGrid, s)}</li>
                  ))}
              </ul>
            </div>
            <div>
              <h3>{t('common.down')}</h3>
              <ul>
                {slots
                  .filter((s) => s.direction === 'down')
                  .map((s) => (
                    <li key={`d${s.number}-${s.row}-${s.col}`}>{sliceAnswer(solvedGrid, s)}</li>
                  ))}
              </ul>
            </div>
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

export default ScanArrowCrossword
