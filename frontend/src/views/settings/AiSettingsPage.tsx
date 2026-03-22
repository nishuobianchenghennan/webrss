/**
 * AI 模型设置页面
 */

import { useEffect, useMemo, useState } from 'react'
import { Bot, CircleAlert, Loader2, Plus, RefreshCw, Trash2, Wand2 } from 'lucide-react'
import { SettingsSection } from './SettingsSection'
import { useAiStore } from '@/stores/aiStore'
import { formatDateTimeFull } from '@/lib/date'

export default function AiSettingsPage() {
  const {
    providers,
    activeProviderId,
    addProvider,
    updateProvider,
    removeProvider,
    setActiveProvider,
    setProviderModel,
    addModelToProvider,
    removeModelFromProvider,
    syncProviderModels,
  } = useAiStore()
  const [newModel, setNewModel] = useState('')

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === activeProviderId) ?? providers[0] ?? null,
    [activeProviderId, providers]
  )

  useEffect(() => {
    if (!activeProvider) return
    if (!activeProvider.apiKey.trim() || !activeProvider.baseUrl.trim()) return

    const timer = window.setTimeout(() => {
      void syncProviderModels(activeProvider.id)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [activeProvider?.id, activeProvider?.apiKey, activeProvider?.baseUrl, syncProviderModels])

  const handleAddProvider = () => {
    const providerId = addProvider({
      name: `模型商 ${providers.length + 1}`,
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      models: [],
      selectedModel: '',
    })
    setActiveProvider(providerId)
  }

  const handleAddModel = () => {
    if (!activeProvider) return
    addModelToProvider(activeProvider.id, newModel)
    if (!activeProvider.selectedModel && newModel.trim()) {
      setProviderModel(activeProvider.id, newModel.trim())
    }
    setNewModel('')
  }

  return (
    <div className="space-y-4">
      <SettingsSection title="模型商管理" description="沿用 OpenAI 兼容协议，支持多个模型商快捷切换。">
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] items-start">
          <div className="space-y-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setActiveProvider(provider.id)}
                className="w-full text-left rounded-xl px-3 py-2.5 transition-colors"
                style={provider.id === activeProviderId
                  ? { background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }
                  : { background: 'var(--surface-0)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bot size={13} style={{ color: provider.id === activeProviderId ? 'var(--accent)' : 'var(--text-muted)' }} />
                  <span className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {provider.name}
                  </span>
                </div>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {provider.baseUrl}
                </p>
              </button>
            ))}

            <button onClick={handleAddProvider} className="btn-secondary w-full text-[12.5px] justify-center">
              <Plus size={13} />
              新增模型商
            </button>
          </div>

          {activeProvider && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    模型商名称
                  </label>
                  <input
                    value={activeProvider.name}
                    onChange={(event) => updateProvider(activeProvider.id, { name: event.target.value })}
                    className="input"
                    placeholder="例如 OpenAI / DeepSeek / 自建服务"
                  />
                </div>
                <div>
                  <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={activeProvider.apiKey}
                    onChange={(event) => updateProvider(activeProvider.id, { apiKey: event.target.value })}
                    className="input"
                    placeholder="sk-..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Base URL
                </label>
                <input
                  value={activeProvider.baseUrl}
                  onChange={(event) => updateProvider(activeProvider.id, { baseUrl: event.target.value })}
                  className="input"
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void syncProviderModels(activeProvider.id)}
                  className="btn-secondary text-[12px]"
                  disabled={activeProvider.isLoadingModels}
                >
                  {activeProvider.isLoadingModels ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  刷新模型
                </button>
                {providers.length > 1 && (
                  <button
                    onClick={() => removeProvider(activeProvider.id)}
                    className="btn-secondary text-[12px]"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 size={13} />
                    删除模型商
                  </button>
                )}
                {activeProvider.lastModelSyncAt && (
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    上次同步：{formatDateTimeFull(activeProvider.lastModelSyncAt)}
                  </span>
                )}
              </div>

              {activeProvider.modelsError && (
                <div
                  className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px]"
                  style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}
                >
                  <CircleAlert size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{activeProvider.modelsError}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    可用模型
                  </label>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    共 {activeProvider.models.length} 个
                  </span>
                </div>

                <div className="flex gap-2 mb-3">
                  <input
                    value={newModel}
                    onChange={(event) => setNewModel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddModel()
                      }
                    }}
                    className="input"
                    placeholder="手动添加模型，例如 gpt-4o-mini"
                  />
                  <button onClick={handleAddModel} className="btn-secondary text-[12px] whitespace-nowrap">
                    <Wand2 size={13} />
                    添加
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeProvider.models.map((model) => (
                    <div
                      key={model}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px]"
                      style={model === activeProvider.selectedModel
                        ? { background: 'var(--accent-subtle)', color: 'var(--accent-text)' }
                        : { background: 'var(--surface-0)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                    >
                      <button onClick={() => setProviderModel(activeProvider.id, model)}>
                        {model}
                      </button>
                      <button
                        onClick={() => removeModelFromProvider(activeProvider.id, model)}
                        style={{ color: 'var(--text-disabled)' }}
                        title="删除模型"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  )
}
