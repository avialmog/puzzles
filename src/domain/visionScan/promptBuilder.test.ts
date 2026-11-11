import { describe, expect, it } from 'vitest'
import { buildVisionPrompt } from './promptBuilder'
import type { PuzzleType } from './types'

const PUZZLE_TYPES: PuzzleType[] = ['sudoku', 'wordSearch', 'crosswordGrid', 'crosswordClues', 'arrowCrossword', 'codeword']

describe('buildVisionPrompt', () => {
  it.each(PUZZLE_TYPES)('returns a non-empty prompt and tool spec for %s', (puzzleType) => {
    const { text, tool } = buildVisionPrompt(puzzleType)
    expect(text.length).toBeGreaterThan(20)
    expect(tool.name).toMatch(/^submit_/)
    expect(tool.input_schema).toHaveProperty('properties')
    expect(tool.input_schema).toHaveProperty('required')
  })

  it('sudoku tool schema requires a grid array', () => {
    const { tool } = buildVisionPrompt('sudoku')
    expect(tool.input_schema.required).toEqual(['grid'])
  })

  it('codeword tool schema requires pattern, numbers, and knownLetters', () => {
    const { tool } = buildVisionPrompt('codeword')
    expect(tool.input_schema.required).toEqual(['rows', 'cols', 'pattern', 'numbers', 'knownLetters'])
  })

  it('arrowCrossword tool schema allows an optional direction per cell', () => {
    const { tool } = buildVisionPrompt('arrowCrossword')
    const properties = tool.input_schema.properties as Record<string, unknown>
    const cells = properties.cells as { items: { required: string[] } }
    expect(cells.items.required).not.toContain('direction')
  })
})
