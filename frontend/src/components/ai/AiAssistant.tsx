/**
 * AI 助手浮动面板 - 支持单篇/多篇文章总结
 */

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, ChevronDown, ChevronUp, CheckSquare, Square, Minimize2, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAiStore } from '@/stores/aiStore'

interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AiAssistantProps {
  currentArticle?: { id: string; title: string; content?: string; summary?: string } | null
  allArticles?: { id: string; title: string; content?: string; summary?: string }[]
}

export default function AiAssistant({ currentArticle, allArticles = [] }: AiAssistantProps) {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showArticleSelector, setShowArticleSelector] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { config } = useAiStore()

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 切换文章选择
  const toggleArticle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // 构建上下文
  const buildContext = () => {
    const targets = selectedIds.size > 0
      ? allArticles.filter(a => selectedIds.has(a.id))
      : currentArticle ? [currentArticle] : []

    if (targets.length === 0) return ''

    return targets.map(a => {
      const body = a.content || a.summary || '（无正文）'
      return `【${a.title}】\n${body.replace(/<[^>]+>/g, '').slice(0, 3000)}`
    }).join('\n\n---\n\n')
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    if (!config.apiKey) {
      setMessages(prev => [...prev, { role: 'assistant', content: '请先在设置页面配置 AI 的 API Key。' }])
      return
    }

    const context = buildContext()
    const userMsg: AiMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const systemPrompt = context
        ? `你是一个 RSS 阅读助手。以下是用户当前阅读的文章内容，请基于这些内容回答用户的问题。\n\n${context}`
        : '你是一个 RSS 阅读助手，帮助用户理解和总结文章内容。'

      const historyMsgs = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))

      const resp = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...historyMsgs,
            { role: 'user', content: text },
          ],
          stream: false,
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error((err as any)?.error?.message || `HTTP ${resp.status}`)
      }

      const data = await resp.json()
      const reply = data.choices?.[0]?.message?.content || '（无响应）'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `错误：${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">

      {/* 悬浮面板 */}
      {open && (
        <div
          className="flex flex-col rounded-2xl shadow-xl overflow-hidden"
          style={{
            width: '360px',
            height: minimized ? 'auto' : '520px',
            background: 'var(--surface-0)',
            border: '1px solid var(--border)',
          }}
        >
          {/* 标题栏 */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-1)' }}
          >
            <div className="flex items-center gap-2">
              <Bot size={15} style={{ color: 'var(--accent)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>AI 助手</span>
              {selectedIds.size > 0 && (
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                >
                  已选 {selectedIds.size} 篇
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(v => !v)}
                className="p-1 rounded hover:bg-[var(--surface-2)] transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title={minimized ? '展开' : '最小化'}
              >
                {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button
                onClick={() => { setOpen(false); setMinimized(false) }}
                className="p-1 rounded hover:bg-[var(--surface-2)] transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* 文章选择器 */}
              {allArticles.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => setShowArticleSelector(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-2 text-[12px] hover:bg-[var(--surface-1)] transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>选择文章进行分析（可多选）</span>
                    {showArticleSelector ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showArticleSelector && (
                    <div className="overflow-y-auto" style={{ maxHeight: '140px' }}>
                      {allArticles.slice(0, 20).map(a => (
                        <button
                          key={a.id}
                          onClick={() => toggleArticle(a.id)}
                          className="w-full flex items-center gap-2 px-4 py-1.5 text-[11.5px] text-left hover:bg-[var(--surface-1)] transition-colors"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {selectedIds.has(a.id)
                            ? <CheckSquare size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            : <Square size={12} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />}
                          <span className="truncate">{a.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 快捷操作 */}
              <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {selectedIds.size > 1 ? (
                  <button
                    onClick={() => setInput('请分别总结这些文章的核心内容，并找出共同主题')}
                    className="text-[11.5px] px-2.5 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                  >
                    批量总结
                  </button>
                ) : (
                  <button
                    onClick={() => setInput('请总结这篇文章的核心内容和要点')}
                    className="text-[11.5px] px-2.5 py-1 rounded-lg transition-colors"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                  >
                    总结文章
                  </button>
                )}
                <button
                  onClick={() => setMessages([])}
                  className="text-[11.5px] px-2.5 py-1 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  清空对话
                </button>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>
                      {currentArticle ? `当前文章：${currentArticle.title.slice(0, 30)}...` : '选择文章后开始对话'}
                    </p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className="max-w-[85%] px-3 py-2 rounded-xl text-[12.5px] leading-relaxed whitespace-pre-wrap"
                      style={{
                        background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface-2)',
                        color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div
                      className="px-3 py-2 rounded-xl flex items-center gap-2"
                      style={{ background: 'var(--surface-2)' }}
                    >
                      <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>思考中...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入框 */}
              <div
                className="flex items-end gap-2 px-3 py-3 flex-shrink-0"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="问点什么… (Enter 发送)"
                  rows={1}
                  className="flex-1 resize-none rounded-lg px-3 py-2 text-[12.5px] outline-none"
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    maxHeight: '80px',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface-2)',
                    color: input.trim() && !loading ? '#fff' : 'var(--text-disabled)',
                  }}
                >
                  <Send size={13} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 浮动按钮 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{
          background: open ? 'var(--accent)' : 'var(--surface-0)',
          border: '1px solid var(--border)',
          color: open ? '#fff' : 'var(--accent)',
        }}
        title="AI 助手"
      >
        <Bot size={20} />
      </button>
    </div>
  )
}
