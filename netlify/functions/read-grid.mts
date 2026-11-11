import Anthropic from '@anthropic-ai/sdk'
import { buildVisionPrompt } from '../../src/domain/visionScan/promptBuilder'
import type { PuzzleType, ReadGridRequest } from '../../src/domain/visionScan/types'

// Accuracy-in-practice is the entire point of this endpoint, so default to the stronger model
// rather than the cheaper one solve-crossword.mts uses for text-only solving.
const MODEL = 'claude-opus-5'

const PUZZLE_TYPES: PuzzleType[] = ['sudoku', 'wordSearch', 'crosswordGrid', 'crosswordClues', 'arrowCrossword', 'codeword']
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function isValidRequest(body: unknown): body is ReadGridRequest {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b.puzzleType === 'string' &&
    (PUZZLE_TYPES as string[]).includes(b.puzzleType) &&
    typeof b.image === 'string' &&
    b.image.length > 0 &&
    typeof b.mediaType === 'string' &&
    MEDIA_TYPES.includes(b.mediaType)
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

  if (!isValidRequest(body)) return jsonResponse({ error: 'Invalid read-grid request shape' }, 400)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return jsonResponse({ error: 'Server is missing ANTHROPIC_API_KEY' }, 500)

  const { text, tool } = buildVisionPrompt(body.puzzleType)

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: body.mediaType, data: body.image } },
            { type: 'text', text },
          ],
        },
      ],
    })

    const toolUse = message.content.find((block) => block.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return jsonResponse({ error: 'Model did not return a reading' }, 502)
    }

    return jsonResponse(toolUse.input)
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 502)
  }
}
