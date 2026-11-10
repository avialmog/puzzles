import Anthropic from '@anthropic-ai/sdk'
import { buildCrosswordPrompt } from '../../src/domain/crossword/promptBuilder'
import type { SolveCrosswordRequest, SolveCrosswordResponse } from '../../src/domain/crossword/types'

const MODEL = 'claude-sonnet-5'

function isValidRequest(body: unknown): body is SolveCrosswordRequest {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.rows === 'number' &&
    typeof b.cols === 'number' &&
    Array.isArray(b.black) &&
    Array.isArray(b.across) &&
    Array.isArray(b.down)
  )
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!isValidRequest(body)) return jsonResponse({ error: 'Invalid crossword request shape' }, 400)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return jsonResponse({ error: 'Server is missing ANTHROPIC_API_KEY' }, 500)

  const prompt = buildCrosswordPrompt(body)

  const tool = {
    name: 'submit_crossword_solution',
    description: 'Submit the fully solved crossword grid.',
    input_schema: {
      type: 'object' as const,
      properties: {
        grid: {
          type: 'array' as const,
          items: { type: 'string' as const },
          description: `Array of exactly ${body.rows} strings, each exactly ${body.cols} characters. Use '#' for black/blocked cells and the single uppercase solved letter for every other cell.`,
        },
      },
      required: ['grid'],
    },
  }

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'submit_crossword_solution' },
      messages: [{ role: 'user', content: prompt }],
    })

    const toolUse = message.content.find((block) => block.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return jsonResponse({ error: 'Model did not return a solution' }, 502)
    }

    const input = toolUse.input as { grid?: unknown }
    if (!Array.isArray(input.grid) || input.grid.some((row) => typeof row !== 'string')) {
      return jsonResponse({ error: 'Model returned a malformed grid' }, 502)
    }

    // Trust our own black-cell pattern for structure; only take letters from white cells.
    const modelGrid = input.grid as string[]
    const grid: string[] = body.black.map((blackRow, r) =>
      blackRow
        .map((isBlack, c) => {
          if (isBlack) return '#'
          const ch = modelGrid[r]?.[c]
          return ch && /[A-Za-z]/.test(ch) ? ch.toUpperCase() : '?'
        })
        .join(''),
    )

    const response: SolveCrosswordResponse = { grid }
    return jsonResponse(response)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 502)
  }
}
