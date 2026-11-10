import type { PixelBuffer } from './imageProcessing'

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
