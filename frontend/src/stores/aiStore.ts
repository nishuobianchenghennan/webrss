/**
 * AI 配置状态管理 - 持久化到 localStorage
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AiConfig {
  apiKey: string
  baseUrl: string
  model: string
}

interface AiState {
  config: AiConfig
  setConfig: (config: Partial<AiConfig>) => void
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      config: {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      },
      setConfig: (partial) =>
        set(state => ({ config: { ...state.config, ...partial } })),
    }),
    { name: 'ai-config' }
  )
)
