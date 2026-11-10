import { describe, expect, it } from 'vitest'
import { parseClueListText } from './clueListParser'

describe('parseClueListText', () => {
  it('splits a clean ACROSS/DOWN list into sections', () => {
    const raw = ['ACROSS', '1. Feline pet', '3. Capital of France', 'DOWN', '1. Automobile', '2. Mythical giant'].join('\n')
    const result = parseClueListText(raw)
    expect(result.across).toBe('1. Feline pet\n3. Capital of France')
    expect(result.down).toBe('1. Automobile\n2. Mythical giant')
  })

  it('merges OCR line-wrapped clue continuations', () => {
    const raw = ['ACROSS', '1. A long clue that wrapped', 'onto a second OCR line', '3. Short clue', 'DOWN', '1. Fine'].join('\n')
    const result = parseClueListText(raw)
    expect(result.across).toBe('1. A long clue that wrapped onto a second OCR line\n3. Short clue')
  })

  it('accepts ) or : as the number separator, normalizing to a period', () => {
    const raw = ['ACROSS', '1) Feline pet', '3: Capital of France', 'DOWN', '1. Automobile'].join('\n')
    const result = parseClueListText(raw)
    expect(result.across).toBe('1. Feline pet\n3. Capital of France')
  })

  it('handles a list with only a DOWN header (everything before it is across)', () => {
    const raw = ['1. Feline pet', 'DOWN', '1. Automobile'].join('\n')
    const result = parseClueListText(raw)
    expect(result.across).toBe('1. Feline pet')
    expect(result.down).toBe('1. Automobile')
  })

  it('puts everything under across when no headers are found at all', () => {
    const raw = ['1. Feline pet', '2. Automobile'].join('\n')
    const result = parseClueListText(raw)
    expect(result.across).toBe('1. Feline pet\n2. Automobile')
    expect(result.down).toBe('')
  })

  it('ignores blank lines', () => {
    const raw = ['ACROSS', '', '1. Feline pet', '', 'DOWN', '', '1. Automobile'].join('\n')
    const result = parseClueListText(raw)
    expect(result.across).toBe('1. Feline pet')
    expect(result.down).toBe('1. Automobile')
  })
})
