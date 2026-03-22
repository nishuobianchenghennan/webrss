/**
 * AI 助手浮动面板 - 支持多模型商、对话历史、单/多篇文章分析
 */

import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  X,
  Send,
  Loader2,
  ChevronDown,
  CheckSquare,
  Square,
  History,
  ChevronLeft,
  Trash2,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTimeFull } from '@/lib/date'
import { createChatCompletion } from '@/lib/ai'
import { useAiStore } from '@/stores/aiStore'
import type { AiConversation, AiMessage } from '@/stores/aiStore'

interface ArticleItem {
  id: string
  title: string
  content?: string
  summary?: string
}

interface AiAssistantProps {
  currentArticle?: ArticleItem | null
  allArticles?: ArticleItem[]
}

type PanelView = 'chat' | 'history'

type QuickAction = {
  label: string
  prompt: string
}

const quickActions: QuickAction[] = [
  { label: '总结', prompt: '请用简洁的语言总结以上文章的核心内容。' },
  { label: '要点', prompt: '请提取以上文章的 3-5 个关键要点。' },
  { label: '问答', prompt: '请基于以上文章提出 3 个有价值的思考问题并回答。' },
]

export default function AiAssistant({ currentArticle, allArticles = [] }: AiAssistantProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<PanelView>('chat')
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showArticleSelector, setShowArticleSelector] = useState(false)
  const [providerOpen, setProviderOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const {
    providers,
    activeProviderId,
    getActiveProvider,
    setActiveProvider,
    setProviderModel,
    saveConversation,
    loadConversation,
    conversations,
    deleteConversation,
  } = useAiStore()

  const activeProvider = getActiveProvider()

  // 滚动到最新消息
  useEffect(() => {
    if (!open) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, open])

  // 构建文章上下文
  const buildContext = () => {
    const targets =
      selectedIds.size > 0
        ? allArticles.filter((article) => selectedIds.has(article.id))
        : currentArticle
          ? [currentArticle]
          : []

    if (targets.length === 0) return ''

    return targets
      .map((article) => {
        const body = article.content || article.summary || '（无正文）'
        const plainText = body.replace(/<[^>]+>/g, '').slice(0, 3000)
        return `【${article.title}】\n${plainText}`
      })
      .join('\n\n---\n\n')
  }

  // 保存当前对话
  const persistCurrentConversation = (nextMessages: AiMessage[] = messages) => {
    if (nextMessages.length === 0) {
      setActiveConversationId(null)
      return null
    }

    const conversationId = saveConversation(nextMessages, activeConversationId)
    if (conversationId) {
      setActiveConversationId(conversationId)
    }
    return conversationId
  }

  // 切换文章选择
  const toggleArticle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 发送消息（可用于快捷操作覆盖输入）
  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return

    if (!activeProvider?.apiKey.trim()) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '请先在设置页面配置 AI 的 API Key。', createdAt: new Date().toISOString() },
      ])
      return
    }

    if (!activeProvider.baseUrl.trim()) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '请先在设置页面配置 Base URL。', createdAt: new Date().toISOString() },
      ])
      return
    }

    if (!activeProvider.selectedModel) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '当前模型商未选择模型，请在设置中配置模型列表并选择。',
          createdAt: new Date().toISOString(),
        },
      ])
      return
    }

    const context = buildContext()
    const userMessage: AiMessage = {
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    if (!overrideText) {
      setInput('')
    }
    setLoading(true)

    try {
      const systemPrompt = context
        ? `你是一个 RSS 阅读助手。以下是用户当前阅读的文章内容，请基于这些内容回答用户的问题。\n\n${context}`
        : '你是一个 RSS 阅读助手，帮助用户理解和总结文章内容。'

      const historyMessages = messages.slice(-10).map((message) => ({
        role: message.role,
        content: message.content,
      }))

      const reply = await createChatCompletion({
        apiKey: activeProvider.apiKey,
        baseUrl: activeProvider.baseUrl,
        model: activeProvider.selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages,
          { role: 'user', content: text },
        ],
      })

      const assistantMessage: AiMessage = {
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
      }
      const updatedMessages = [...nextMessages, assistantMessage]
      setMessages(updatedMessages)
      persistCurrentConversation(updatedMessages)
    } catch (error: any) {
      const assistantMessage: AiMessage = {
        role: 'assistant',
        content: `错误：${error?.message || '请求失败'}`,
        createdAt: new Date().toISOString(),
      }
      const updatedMessages = [...nextMessages, assistantMessage]
      setMessages(updatedMessages)
      persistCurrentConversation(updatedMessages)
    } finally {
      setLoading(false)
    }
  }

  // 关闭面板时自动保存当前对话
  const handleClose = () => {
    persistCurrentConversation()
    setOpen(false)
    setMessages([])
    setInput('')
    setView('chat')
    setSelectedIds(new Set())
    setShowArticleSelector(false)
    setProviderOpen(false)
    setModelOpen(false)
    setActiveConversationId(null)
  }

  // 新对话
  const handleNewChat = () => {
    persistCurrentConversation()
    setMessages([])
    setInput('')
    setView('chat')
    setActiveConversationId(null)
  }

  // 恢复历史对话
  const handleLoadConversation = (conversation: AiConversation) => {
    persistCurrentConversation()
    const loadedConversation = loadConversation(conversation.id) || conversation
    setMessages(loadedConversation.messages)
    setActiveConversationId(loadedConversation.id)
    setInput('')
    setView('chat')
  }

  // 删除历史对话
  const handleDeleteConversation = (event: React.MouseEvent<HTMLButtonElement>, conversationId: string) => {
    event.stopPropagation()
    deleteConversation(conversationId)

    if (conversationId === activeConversationId) {
      setActiveConversationId(null)
    }
  }

  // 输入框回车发送（Shift + Enter 换行）
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
          >
            <Bot size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              和 AI 一起阅读这篇文章
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              可以让它总结要点、提出问题，或分析多篇文章的差异。
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => void handleSend(action.prompt)}
                className="px-2.5 py-1.5 rounded-full text-[11.5px] border transition-colors"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  background: 'var(--surface-0)',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {messages.map((message, index) => {
          const isUser = message.role === 'user'

          return (
            <div key={`${message.createdAt || index}-${index}`} className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words',
                    isUser
                      ? 'bg-[var(--accent)] text-white rounded-br-sm'
                      : 'bg-[var(--surface-1)] text-[var(--text-primary)] rounded-bl-sm'
                  )}
                  style={{ border: isUser ? 'none' : '1px solid var(--border-subtle)' }}
                >
                  {message.content}
                </div>
                {message.createdAt && (
                  <p
                    className={cn('mt-1 text-[10px]', isUser ? 'text-right' : 'text-left')}
                    style={{ color: 'var(--text-disabled)' }}
                  >
                    {formatDateTimeFull(message.createdAt)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        {loading && (
          <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={14} className="animate-spin" />
            <span>正在思考...</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* 悬浮面板 */}
      {open && (
        <div
          className="flex flex-col rounded-2xl shadow-xl overflow-hidden"
          style={{
            width: '360px',
            height: '540px',
            background: 'var(--surface-0)',
            border: '1px solid var(--border)',
          }}
        >
          {/* 顶部标题栏 */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            {/* Provider 下拉 */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setProviderOpen((value) => !value)
                  setModelOpen(false)
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-medium max-w-full truncate transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Bot size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span className="truncate">{activeProvider?.name || 'AI 助手'}</span>
                <ChevronDown size={11} style={{ flexShrink: 0 }} />
              </button>
              {providerOpen && (
                <div
                  className="absolute top-full left-0 mt-1 w-40 rounded-xl shadow-lg overflow-hidden z-10"
                  style={{ background: 'var(--surface-0)', border: '1px solid var(--border)' }}
                >
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => {
                        setActiveProvider(provider.id)
                        setProviderOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-[12px] transition-colors hover:bg-[var(--surface-1)]"
                      style={{
                        color: provider.id === activeProviderId ? 'var(--accent)' : 'var(--text-primary)',
                        fontWeight: provider.id === activeProviderId ? 600 : 400,
                      }}
                    >
                      {provider.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Model 下拉 */}
            {activeProvider && activeProvider.models.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setModelOpen((value) => !value)
                    setProviderOpen(false)
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11.5px] transition-colors hover:bg-[var(--surface-2)] max-w-[110px] truncate"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                >
                  <span className="truncate">{activeProvider.selectedModel || '选择模型'}</span>
                  <ChevronDown size={10} style={{ flexShrink: 0 }} />
                </button>
                {modelOpen && (
                  <div
                    className="absolute top-full right-0 mt-1 w-48 rounded-xl shadow-lg overflow-hidden z-10"
                    style={{
                      background: 'var(--surface-0)',
                      border: '1px solid var(--border)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {activeProvider.models.map((model) => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => {
                          setProviderModel(activeProvider.id, model)
                          setModelOpen(false)
                        }}
                        className="w-full text-left px-3 py-2 text-[12px] transition-colors hover:bg-[var(--surface-1)] truncate"
                        style={{
                          color: model === activeProvider.selectedModel ? 'var(--accent)' : 'var(--text-primary)',
                          fontWeight: model === activeProvider.selectedModel ? 600 : 400,
                        }}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex items-center gap-0.5 ml-1">
              <button
                type="button"
                onClick={handleNewChat}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--text-muted)' }}
                title="新对话"
              >
                <Plus size={13} />
              </button>
              <button
                type="button"
                onClick={() => setView((currentView) => (currentView === 'history' ? 'chat' : 'history'))}
                className={cn(
                  'w-6 h-6 flex items-center justify-center rounded-lg transition-colors',
                  view === 'history' ? 'bg-[var(--accent-subtle)]' : 'hover:bg-[var(--surface-2)]'
                )}
                style={{ color: view === 'history' ? 'var(--accent)' : 'var(--text-muted)' }}
                title="历史对话"
              >
                <History size={13} />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: 'var(--text-muted)' }}
                title="关闭"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* 主体区域：历史对话 / 聊天 */}
          {view === 'history' ? (
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <History size={28} style={{ color: 'var(--text-disabled)' }} />
                  <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>
                    暂无历史对话
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map((conversation) => {
                    const latestMessage = conversation.messages[conversation.messages.length - 1]
                    const isActiveConversation = conversation.id === activeConversationId

                    return (
                      <div
                        key={conversation.id}
                        className="group flex items-start gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                        onClick={() => handleLoadConversation(conversation)}
                        style={isActiveConversation
                          ? { background: 'var(--accent-subtle)' }
                          : { background: 'transparent' }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p
                              className="text-[12.5px] truncate font-medium"
                              style={{ color: isActiveConversation ? 'var(--accent)' : 'var(--text-primary)' }}
                            >
                              {conversation.title}
                            </p>
                            {isActiveConversation && (
                              <span className="text-[10px]" style={{ color: 'var(--accent)' }}>
                                当前会话
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                            {latestMessage?.content || '暂无消息'}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-disabled)' }}>
                            {formatDateTimeFull(conversation.updatedAt)}
                            &nbsp;·&nbsp;{conversation.messages.length} 条消息
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => handleDeleteConversation(event, conversation.id)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:bg-[var(--surface-2)]"
                          style={{ color: 'var(--text-disabled)' }}
                          title="删除历史对话"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* 文章选择器 */}
              {allArticles.length > 0 && (
                <div
                  className="flex-shrink-0"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <button
                    type="button"
                    onClick={() => setShowArticleSelector((value) => !value)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-[var(--surface-1)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ChevronDown
                      size={12}
                      style={{
                        transform: showArticleSelector ? '' : 'rotate(-90deg)',
                        transition: 'transform 0.15s',
                      }}
                    />
                    <span className="flex-1 text-left">
                      {selectedIds.size > 0
                        ? `已选 ${selectedIds.size} 篇文章`
                        : currentArticle
                          ? `当前：${currentArticle.title.slice(0, 28)}`
                          : '选择文章上下文'}
                    </span>
                  </button>
                  {showArticleSelector && (
                    <div className="max-h-32 overflow-y-auto px-2 pb-2">
                      {allArticles.map((article) => (
                        <button
                          key={article.id}
                          type="button"
                          onClick={() => toggleArticle(article.id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11.5px] transition-colors hover:bg-[var(--surface-2)]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {selectedIds.has(article.id) ? (
                            <CheckSquare
                              size={13}
                              style={{ color: 'var(--accent)', flexShrink: 0 }}
                            />
                          ) : (
                            <Square
                              size={13}
                              style={{ color: 'var(--text-disabled)', flexShrink: 0 }}
                            />
                          )}
                          <span className="truncate">{article.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-3">
                {renderMessages()}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入区域 */}
              <div
                className="flex-shrink-0 px-3 py-2 space-y-2"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-1 flex-wrap">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => void handleSend(action.prompt)}
                      className="px-2 py-1 rounded-full text-[11px] border transition-colors mb-1"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-muted)',
                        background: 'var(--surface-0)',
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>

                <div
                  className="flex items-end gap-2 rounded-xl px-2.5 py-1.5"
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <textarea
                    rows={2}
                    className="flex-1 bg-transparent resize-none text-[13px] outline-none"
                    style={{ color: 'var(--text-primary)' }}
                    placeholder={
                      currentArticle
                        ? '就当前文章提问，Shift+Enter 换行，Enter 发送...'
                        : '输入你的问题，Shift+Enter 换行，Enter 发送...'
                    }
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={loading || !input.trim()}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                    style={{
                      background: loading || !input.trim() ? 'var(--surface-2)' : 'var(--accent)',
                      color: loading || !input.trim() ? 'var(--text-disabled)' : '#fff',
                    }}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 悬浮按钮 */}
      <button
        type="button"
        onClick={() => {
          if (open) {
            handleClose()
            return
          }
          setOpen(true)
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-full shadow-md transition-colors"
        style={{
          background: 'var(--surface-0)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        {open ? (
          <ChevronLeft size={16} style={{ color: 'var(--text-muted)' }} />
        ) : (
          <Bot size={18} style={{ color: 'var(--accent)' }} />
        )}
        <span className="text-[13px] font-medium">AI 助手</span>
      </button>
    </div>
  )
}
