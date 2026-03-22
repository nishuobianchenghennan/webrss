/**
 * AI 模型设置页面
 */

import { useMemo, useState } from 'react'
import { Bot, CircleAlert, Loader2, Plus, RefreshCw, Trash2, Check } from 'lucide-react'
import { SettingsSection } from './SettingsSection'
import { useAiStore } from '@/stores/aiStore'
import { fetchAvailableModels } from '@/lib/ai'
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
  } = useAiStore()

  const [newModel, setNewModel] = useState('')
  // 手动拉取到的待选模型列表（不自动写入 store）
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  const activeProvider = useMemo(
    () => providers.find((provider) => provider.id === activeProviderId) ?? providers[0] ?? null,
    [activeProviderId, providers]
  )

  // 切换 provider 时重置拉取状态
  const handleSelectProvider = (id: string) => {
    setActiveProvider(id)
    setFetchedModels([])
    setFetchError('')
    setLastSyncAt(null)
  }

  const handleAddProvider = () => {
    const providerId = addProvider({
      name: `模型商 ${providers.length + 1}`,
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      models: [],
      selectedModel: '',
    })
    setActiveProvider(providerId)
    setFetchedModels([])
    setFetchError('')
    setLastSyncAt(null)
  }

  // 手动拉取模型：清空上次拉取结果，不改动已保存的模型
  const handleFetchModels = async () => {
    if (!activeProvider) return
    if (!activeProvider.apiKey.trim() || !activeProvider.baseUrl.trim()) {
      setFetchError('请先填写 API Key 和 Base URL')
      return
    }

    setIsFetching(true)
    setFetchedModels([])
    setFetchError('')

    try {
      const models = await fetchAvailableModels({
        apiKey: activeProvider.apiKey,
        baseUrl: activeProvider.baseUrl,
      })
      setFetchedModels(models)
      setLastSyncAt(new Date().toISOString())
      if (models.length === 0) {
        setFetchError('未获取到可用模型')
      }
    } catch (error: any) {
      setFetchError(error?.message || '模型获取失败')
    } finally {
      setIsFetching(false)
    }
  }

  // 从待选列表中点击添加某个模型
  const handleAddFetchedModel = (model: string) => {
    if (!activeProvider) return
    addModelToProvider(activeProvider.id, model)
    if (!activeProvider.selectedModel) {
      setProviderModel(activeProvider.id, model)
    }
  }

  // 手动输入添加模型
  const handleAddManualModel = () => {
    if (!activeProvider || !newModel.trim()) return
    addModelToProvider(activeProvider.id, newModel.trim())
    if (!activeProvider.selectedModel) {
      setProviderModel(activeProvider.id, newModel.trim())
    }
    setNewModel('')
  }

  return (
    <div className="space-y-4">
      <SettingsSection title="模型商管理" description="沿用 OpenAI 兼容协议，支持多个模型商快捷切换。">
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] items-start">
          {/* 左侧：模型商列表 */}
          <div className="space-y-2">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleSelectProvider(provider.id)}
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

          {/* 右侧：模型商详情 */}
          {activeProvider && (
            <div className="space-y-4">
              {/* 基本信息 */}
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

              {/* 操作栏 */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void handleFetchModels()}
                  className="btn-secondary text-[12px]"
                  disabled={isFetching}
                >
                  {isFetching ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  拉取可用模型
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
                {lastSyncAt && (
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    上次拉取：{formatDateTimeFull(lastSyncAt)}
                  </span>
                )}
              </div>

              {/* 错误提示 */}
              {fetchError && (
                <div
                  className="rounded-xl px-3 py-2 flex items-start gap-2 text-[12px]"
                  style={{ background: 'var(--warning-subtle)', color: 'var(--warning)' }}
                >
                  <CircleAlert size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{fetchError}</span>
                </div>
              )}

              {/* 从远端拉取到的待选模型 */}
              {fetchedModels.length > 0 && (
                <div>
                  <p className="text-[12.5px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    可用模型（点击添加）
                  </p>
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--border-subtle)' }}
                  >
                    {fetchedModels.map((model, index) => {
                      const isAdded = activeProvider.models.includes(model)
                      return (
                        <div
                          key={model}
                          className="flex items-center justify-between px-3 py-2 text-[12.5px] transition-colors"
                          style={{
                            borderTop: index > 0 ? '1px solid var(--border-subtle)' : undefined,
                            background: isAdded ? 'var(--accent-subtle)' : undefined,
                          }}
                        >
                          <span
                            className="font-mono"
                            style={{ color: isAdded ? 'var(--accent-text)' : 'var(--text-primary)' }}
                          >
                            {model}
                          </span>
                          {isAdded ? (
                            <span
                              className="flex items-center gap-1 text-[11px]"
                              style={{ color: 'var(--accent)' }}
                            >
                              <Check size={12} />
                              已添加
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddFetchedModel(model)}
                              className="text-[11.5px] px-2.5 py-1 rounded-lg transition-colors"
                              style={{
                                background: 'var(--surface-2)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              添加
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 已添加模型列表 */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    已添加模型
                  </label>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    共 {activeProvider.models.length} 个
                  </span>
                </div>

                {/* 手动输入添加 */}
                <div className="flex gap-2 mb-3">
                  <input
                    value={newModel}
                    onChange={(event) => setNewModel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddManualModel()
                      }
                    }}
                    className="input"
                    placeholder="手动输入模型名，例如 gpt-4o-mini"
                  />
                  <button
                    onClick={handleAddManualModel}
                    disabled={!newModel.trim()}
                    className="btn-secondary text-[12px] whitespace-nowrap"
                  >
                    <Plus size={13} />
                    添加
                  </button>
                </div>

                {/* 行式模型列表 */}
                {activeProvider.models.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>
                    暂无已添加模型，可从上方拉取或手动输入。
                  </p>
                ) : (
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--border-subtle)' }}
                  >
                    {activeProvider.models.map((model, index) => (
                      <div
                        key={model}
                        className="flex items-center justify-between px-3 py-2.5 transition-colors"
                        style={{
                          borderTop: index > 0 ? '1px solid var(--border-subtle)' : undefined,
                          background: model === activeProvider.selectedModel
                            ? 'var(--accent-subtle)'
                            : undefined,
                        }}
                      >
                        <button
                          onClick={() => setProviderModel(activeProvider.id, model)}
                          className="flex-1 text-left text-[12.5px] font-mono"
                          style={{
                            color: model === activeProvider.selectedModel
                              ? 'var(--accent-text)'
                              : 'var(--text-primary)',
                          }}
                        >
                          {model}
                          {model === activeProvider.selectedModel && (
                            <span
                              className="ml-2 text-[10px] font-sans font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: 'var(--accent)', color: '#fff' }}
                            >
                              使用中
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => removeModelFromProvider(activeProvider.id, model)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                          style={{ color: 'var(--text-disabled)' }}
                          title="删除模型"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  )
}
