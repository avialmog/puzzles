import { estimateGridSize, warpToSquare, type Point, type PixelBuffer } from './imageProcessing'

const DETECT_WARP_SIZE = 400

export function imageDataToPixelBuffer(imageData: ImageData): PixelBuffer {
  return { width: imageData.width, height: imageData.height, data: imageData.data }
}

export function pixelBufferToCanvas(buffer: PixelBuffer): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = buffer.width
  canvas.height = buffer.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height), 0, 0)
  return canvas
}

export function upscaleCanvas(source: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = source.width * factor
  canvas.height = source.height * factor
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Best-effort auto-detect of a square grid's cell count from the 4 tapped corners of a photo canvas. */
export function detectGridSizeFromCanvas(
  canvas: HTMLCanvasElement,
  corners: [Point, Point, Point, Point],
  minSize: number,
  maxSize: number,
): number | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  try {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const buffer = imageDataToPixelBuffer(imageData)
    const warped = warpToSquare(buffer, corners, DETECT_WARP_SIZE)
    return estimateGridSize(warped, minSize, maxSize)
  } catch {
    return null
  }
}
