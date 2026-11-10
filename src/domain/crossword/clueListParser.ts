export interface ParsedClueSections {
  across: string
  down: string
}

const CLUE_START = /^(\d+)\s*[.):]\s*(.*)$/

function mergeContinuationLines(lines: string[]): string[] {
  const clues: string[] = []
  for (const line of lines) {
    if (CLUE_START.test(line) || clues.length === 0) {
      clues.push(line)
    } else {
      clues[clues.length - 1] += ` ${line}`
    }
  }
  return clues
}

function normalizeClueLine(line: string): string {
  const match = line.match(CLUE_START)
  if (!match) return line.trim()
  return `${match[1]}. ${match[2].trim()}`
}

/**
 * Splits raw OCR'd text from a photographed clue list into across/down sections.
 * Looks for "ACROSS"/"DOWN" section headers (case-insensitive); merges OCR line-wraps
 * back into a single clue per line, keyed off each clue's leading number.
 */
export function parseClueListText(rawText: string): ParsedClueSections {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const acrossHeaderIndex = lines.findIndex((l) => /^across\b/i.test(l))
  const downHeaderIndex = lines.findIndex((l) => /^down\b/i.test(l))

  let acrossLines: string[]
  let downLines: string[]

  if (acrossHeaderIndex !== -1 && downHeaderIndex !== -1 && downHeaderIndex > acrossHeaderIndex) {
    acrossLines = lines.slice(acrossHeaderIndex + 1, downHeaderIndex)
    downLines = lines.slice(downHeaderIndex + 1)
  } else if (downHeaderIndex !== -1) {
    acrossLines = lines.slice(0, downHeaderIndex)
    downLines = lines.slice(downHeaderIndex + 1)
  } else {
    // No recognizable headers - can't tell across from down, so surface everything
    // as across and let the user move/retype what belongs under down.
    acrossLines = lines
    downLines = []
  }

  const across = mergeContinuationLines(acrossLines).map(normalizeClueLine).join('\n')
  const down = mergeContinuationLines(downLines).map(normalizeClueLine).join('\n')

  return { across, down }
}
