/**
 * 添加订阅源对话框 - Claude 风格设计
 */

import { useState } from 'react'
import { X, Search, Plus, Loader2, Rss, CheckCircle, ChevronRight, Globe } from 'lucide-react'
import { useDiscoverFeed, useCreateFeed } from '@/hooks/useFeeds'
import { useCategories } from '@/hooks/useCategories'
import { cn } from '@/lib/utils'

interface AddFeedDialogProps {
  onClose: () => void
}

const RECOMMENDATIONS = [
  { title: 'Hacker News', url: 'https://news.ycombinator.com/rss', desc: '科技资讯' },
  { title: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/atom.xml', desc: '技术博客' },
  { title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', desc: '科技新闻' },
  { title: 'CSS-Tricks', url: 'https://css-tricks.com/feed/', desc: '前端技术' },
]

export default function AddFeedDialog({ onClose }: AddFeedDialogProps) {
  const [url, setUrl] = useState('')
  const [selectedFeed, setSelectedFeed] = useState<any>(null)
  const [categoryId, setCategoryId] = useState('')
  const [success, setSuccess] = useState(false)

  const { data: categories = [] } = useCategories()
  const discoverMutation = useDiscoverFeed()
  const createMutation = useCreateFeed()

  const handleDiscover = async (targetUrl?: string) => {
    const feedUrl = targetUrl || url.trim()
    if (!feedUrl) return
    setSelectedFeed(null)
    try {
      const res = await discoverMutation.mutateAsync(feedUrl) as any
      const feeds = res.data || []
      if (feeds.length > 0) setSelectedFeed(feeds[0])
    } catch (err: any) {
      alert(err?.message || '未找到 RSS 源，请检查 URL')
    }
  }

  const handleSubscribe = async () => {
    if (!selectedFeed) return
    try {
      await createMutation.mutateAsync({
        feed_url: selectedFeed.feed_url,
        category_id: categoryId || undefined,
        title: selectedFeed.title,
      })
      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch (err: any) {
      alert(err?.message || '订阅失败')
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-[440px]">

        {/* 头部 */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              添加订阅源
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              支持 RSS、Atom、JSON Feed
            </p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* URL 输入区 */}
          <div>
            <label className="block text-[12px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              网站或 Feed 地址
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-disabled)' }} />
                <input
                  type="url"
                  className="input pl-8"
                  placeholder="https://example.com"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setSelectedFeed(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleDiscover()}
                  autoFocus
                />
              </div>
              <button
                onClick={() => handleDiscover()}
                disabled={discoverMutation.isPending || !url.trim()}
                className="btn-primary px-3 py-2"
                style={{ borderRadius: '10px', minWidth: '80px' }}
              >
                {discoverMutation.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <><Search size={13} /> 发现</>
                }
              </button>
            </div>
          </div>

          {/* 发现结果 */}
          {selectedFeed && !success && (
            <div
              className="rounded-xl p-4 animate-slide-in"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--accent-subtle)' }}
                >
                  <Rss size={16} style={{ color: 'var(--accent-text)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {selectedFeed.title}
                  </p>
                  <p className="text-[11.5px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {selectedFeed.feed_url}
                  </p>
                  {selectedFeed.description && (
                    <p className="text-[12px] mt-1.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {selectedFeed.description}
                    </p>
                  )}
                </div>
              </div>

              {/* 分类选择 */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-[11.5px] font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    添加到分类
                  </label>
                  <select
                    className="input text-[13px]"
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                  >
                    <option value="">未分类</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* 成功状态 */}
          {success && (
            <div
              className="rounded-xl p-4 flex items-center gap-3 animate-scale-in"
              style={{ background: 'var(--success-subtle)' }}
            >
              <CheckCircle size={20} style={{ color: 'var(--success)' }} />
              <p className="text-[13px] font-medium" style={{ color: 'var(--success)' }}>
                订阅成功！
              </p>
            </div>
          )}

          {/* 快速推荐 */}
          {!selectedFeed && !success && (
            <div>
              <p className="text-[11.5px] font-medium mb-2" style={{ color: 'var(--text-disabled)' }}>
                热门推荐
              </p>
              <div className="space-y-1">
                {RECOMMENDATIONS.map(item => (
                  <button
                    key={item.url}
                    onClick={() => { setUrl(item.url); handleDiscover(item.url) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-100"
                    style={{ borderRadius: '10px' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-1)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '' }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--surface-2)' }}
                    >
                      <Rss size={12} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.title}
                      </p>
                      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                    </div>
                    <ChevronRight size={14} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        {selectedFeed && !success && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button onClick={onClose} className="btn-secondary">取消</button>
            <button
              onClick={handleSubscribe}
              disabled={createMutation.isPending}
              className="btn-primary"
              style={{ borderRadius: '10px' }}
            >
              {createMutation.isPending
                ? <><Loader2 size={13} className="animate-spin" /> 订阅中...</>
                : <><Plus size={13} /> 订阅</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
