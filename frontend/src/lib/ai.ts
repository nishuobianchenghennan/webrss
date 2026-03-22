/**
 * AI 请求工具 - OpenAI 兼容接口
 */

export interface AiRequestConfig {
  apiKey: string
  baseUrl: string
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAiModelItem {
  id?: string
}

interface OpenAiModelsResponse {
  data?: OpenAiModelItem[]
}

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}

async function buildAiError(response: Response): Promise<Error> {
  const fallback = `HTTP ${response.status}`

  try {
    const data = await response.json()
    const message = (data as any)?.error?.message || (data as any)?.message || fallback
    return new Error(message)
  } catch {
    return new Error(fallback)
  }
}

export async function fetchAvailableModels(config: AiRequestConfig): Promise<string[]> {
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/models`, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  })

  if (!response.ok) {
    throw await buildAiError(response)
  }

  const data = (await response.json()) as OpenAiModelsResponse

  return Array.from(
    new Set(
      (data.data || [])
        .map((item) => item.id?.trim())
        .filter((id): id is string => Boolean(id))
    )
  )
}

export async function createChatCompletion(
  config: AiRequestConfig & {
    model: string
    messages: AiChatMessage[]
  }
): Promise<string> {
  const response = await fetch(`${normalizeBaseUrl(config.baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: config.messages,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw await buildAiError(response)
  }

  const data = (await response.json()) as OpenAiChatResponse
  return data.choices?.[0]?.message?.content || '（无响应）'
}
