/**
 * AI 配置状态管理 - 支持多模型商、模型同步、对话历史
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchAvailableModels } from '@/lib/ai'

export interface AiProvider {
  id: string
  name: string
  apiKey: string
  baseUrl: string
  models: string[]
  selectedModel: string
  isLoadingModels: boolean
  modelsError: string
  lastModelSyncAt: string | null
}

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

export interface AiConversation {
  id: string
  title: string
  messages: AiMessage[]
  createdAt: string
  updatedAt: string
}

type AiProviderInput = Omit<
  AiProvider,
  'id' | 'isLoadingModels' | 'modelsError' | 'lastModelSyncAt'
>

const DEFAULT_PROVIDERS: AiProvider[] = [
  normalizeProvider({
    id: 'openai-default',
    name: 'OpenAI',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    selectedModel: 'gpt-4o-mini',
  }),
]

interface AiState {
  providers: AiProvider[]
  activeProviderId: string
  conversations: AiConversation[]

  getActiveProvider: () => AiProvider | null
  loadConversation: (id: string) => AiConversation | null

  addProvider: (provider: AiProviderInput) => string
  updateProvider: (id: string, patch: Partial<Omit<AiProvider, 'id'>>) => void
  removeProvider: (id: string) => void
  setActiveProvider: (id: string) => void
  setProviderModel: (providerId: string, model: string) => void
  addModelToProvider: (providerId: string, model: string) => void
  removeModelFromProvider: (providerId: string, model: string) => void
  syncProviderModels: (providerId: string) => Promise<string[]>

  saveConversation: (messages: AiMessage[], conversationId?: string | null) => string | null
  deleteConversation: (id: string) => void
  clearConversations: () => void
}

function normalizeProvider(provider: Partial<AiProvider> & Pick<AiProvider, 'name' | 'baseUrl'>): AiProvider {
  const models = Array.from(new Set((provider.models || []).filter(Boolean)))
  const selectedModel = provider.selectedModel && models.includes(provider.selectedModel)
    ? provider.selectedModel
    : (models[0] ?? '')

  return {
    id: provider.id || `provider-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: provider.name,
    apiKey: provider.apiKey || '',
    baseUrl: provider.baseUrl,
    models,
    selectedModel,
    isLoadingModels: false,
    modelsError: provider.modelsError || '',
    lastModelSyncAt: provider.lastModelSyncAt || null,
  }
}

function normalizeMessage(message: Partial<AiMessage>, fallbackTime: string): AiMessage {
  return {
    role: message.role === 'assistant' ? 'assistant' : 'user',
    content: message.content || '',
    createdAt: message.createdAt || fallbackTime,
  }
}

function normalizeConversation(conversation: Partial<AiConversation>): AiConversation {
  const createdAt = conversation.createdAt || conversation.updatedAt || new Date().toISOString()
  const messages = (conversation.messages || []).map((message) => normalizeMessage(message, createdAt))
  const titleSource = messages.find((message) => message.role === 'user')?.content || conversation.title || '对话'

  return {
    id: conversation.id || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: titleSource.slice(0, 40) || '对话',
    messages,
    createdAt,
    updatedAt: conversation.updatedAt || createdAt,
  }
}

export const useAiStore = create<AiState>()(
  persist<AiState>(
    (set, get) => ({
      providers: DEFAULT_PROVIDERS,
      activeProviderId: DEFAULT_PROVIDERS[0].id,
      conversations: [],

      getActiveProvider: () => {
        const { providers, activeProviderId } = get()
        return providers.find((provider) => provider.id === activeProviderId) ?? null
      },

      loadConversation: (id: string) => {
        const conversation = get().conversations.find((item) => item.id === id)
        return conversation ? normalizeConversation(conversation) : null
      },

      addProvider: (providerData: AiProviderInput) => {
        const provider = normalizeProvider({ ...providerData })
        set((state) => ({
          providers: [...state.providers, provider],
        }))
        return provider.id
      },

      updateProvider: (id: string, patch: Partial<Omit<AiProvider, 'id'>>) => {
        set((state) => ({
          providers: state.providers.map((provider) =>
            provider.id === id
              ? normalizeProvider({ ...provider, ...patch, id: provider.id })
              : provider
          ),
        }))
      },

      removeProvider: (id: string) => {
        set((state) => {
          if (state.providers.length <= 1) {
            return state
          }

          const remaining = state.providers.filter((provider) => provider.id !== id)
          const activeProviderId = state.activeProviderId === id
            ? remaining[0]?.id || state.activeProviderId
            : state.activeProviderId

          return {
            providers: remaining,
            activeProviderId,
          }
        })
      },

      setActiveProvider: (id: string) => set({ activeProviderId: id }),

      setProviderModel: (providerId: string, model: string) => {
        set((state) => ({
          providers: state.providers.map((provider) =>
            provider.id === providerId ? { ...provider, selectedModel: model } : provider
          ),
        }))
      },

      addModelToProvider: (providerId: string, model: string) => {
        const trimmedModel = model.trim()
        if (!trimmedModel) return

        set((state) => ({
          providers: state.providers.map((provider) => {
            if (provider.id !== providerId || provider.models.includes(trimmedModel)) {
              return provider
            }

            const models = [...provider.models, trimmedModel]
            return {
              ...provider,
              models,
              selectedModel: provider.selectedModel || trimmedModel,
            }
          }),
        }))
      },

      removeModelFromProvider: (providerId: string, model: string) => {
        set((state) => ({
          providers: state.providers.map((provider) => {
            if (provider.id !== providerId) return provider

            const models = provider.models.filter((item) => item !== model)
            return {
              ...provider,
              models,
              selectedModel: provider.selectedModel === model ? (models[0] ?? '') : provider.selectedModel,
            }
          }),
        }))
      },

      syncProviderModels: async (providerId: string) => {
        const provider = get().providers.find((item) => item.id === providerId)
        if (!provider) return []

        if (!provider.apiKey.trim() || !provider.baseUrl.trim()) {
          set((state) => ({
            providers: state.providers.map((item) =>
              item.id === providerId
                ? { ...item, modelsError: '请先填写 API Key 和 Base URL' }
                : item
            ),
          }))
          return provider.models
        }

        set((state) => ({
          providers: state.providers.map((item) =>
            item.id === providerId
              ? { ...item, isLoadingModels: true, modelsError: '' }
              : item
          ),
        }))

        try {
          const models = await fetchAvailableModels({
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl,
          })

          set((state) => ({
            providers: state.providers.map((item) =>
              item.id !== providerId
                ? item
                : {
                    ...item,
                    isLoadingModels: false,
                    modelsError: models.length > 0 ? '' : '未获取到可用模型',
                    lastModelSyncAt: new Date().toISOString(),
                  }
            ),
          }))

          return models
        } catch (error: any) {
          set((state) => ({
            providers: state.providers.map((item) =>
              item.id === providerId
                ? {
                    ...item,
                    isLoadingModels: false,
                    modelsError: error?.message || '模型获取失败',
                  }
                : item
            ),
          }))
          return provider.models
        }
      },

      saveConversation: (messages: AiMessage[], conversationId?: string | null) => {
        if (messages.length === 0) return null

        const now = new Date().toISOString()
        const normalizedMessages = messages.map((message) => normalizeMessage(message, now))
        const title = normalizedMessages.find((message) => message.role === 'user')?.content.slice(0, 40) || '对话'
        const nextId = conversationId || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

        set((state) => {
          const existing = state.conversations.find((item) => item.id === nextId)
          const conversation: AiConversation = {
            id: nextId,
            title,
            messages: normalizedMessages,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
          }

          const conversations = [conversation, ...state.conversations.filter((item) => item.id !== nextId)]
            .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
            .slice(0, 50)

          return { conversations }
        })

        return nextId
      },

      deleteConversation: (id: string) => {
        set((state) => ({
          conversations: state.conversations.filter((conversation) => conversation.id !== id),
        }))
      },

      clearConversations: () => set({ conversations: [] }),
    }),
    {
      name: 'ai-store',
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<AiState> | undefined) || {}
        const providersSource = persisted.providers && persisted.providers.length > 0
          ? persisted.providers
          : currentState.providers
        const providers = providersSource.map((provider) => normalizeProvider(provider))
        const activeProviderId = providers.some((provider) => provider.id === persisted.activeProviderId)
          ? persisted.activeProviderId || providers[0]?.id || ''
          : providers[0]?.id || ''
        const conversations = (persisted.conversations || [])
          .map((conversation) => normalizeConversation(conversation))
          .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())

        return {
          ...currentState,
          ...persisted,
          providers,
          activeProviderId,
          conversations,
        }
      },
    }
  )
)
