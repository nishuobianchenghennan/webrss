/**
 * 文章列表组件 - Claude 风格设计
 */

import { useRef } from 'react'
import { RefreshCw, CheckCheck, LayoutList, LayoutGrid, Columns, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReadingStore } from '@/stores'
import { useArticles, useBatchArticles } from '@/hooks/useArticles'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import ArticleRow from '@/components/article/ArticleRow'
import ArticleCard from '@/components/article/ArticleCard'
import type { Article } from '@rss-plus/shared'

const VIEW_MODES = [
  { id: 'list', icon: LayoutList, label: '列表' },
  { id: 'card', icon: LayoutGrid, label: '卡片' },
] as const

const FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'unread', label: '未读' },
  { value: 'starred', label: '收藏' },
] as const

export default function ArticleList() {
  const {
    selectedFeedId, selectedCategoryId, filterStatus,
    setSelectedArticle, selectedArticleId, viewMode, setViewMode, setFilterStatus
  } = useReadingStore()

  const params = {
    feed_id: selectedFeedId || undefined,
    category_id: selectedCategoryId || undefined,
    status: filterStatus,
    sort: 'newest' as const,
    limit: 50,
  }

  const { data, isLoading, refetch, isFetching } = useArticles(params)
  const batchMutation = useBatchArticles()
  const articles: Article[] = (data as any)?.records || []
  const total: number = (data as any)?.total || 0

  const currentIndex = articles.findIndex(a => a.id === selectedArticleId)

  useKeyboardShortcuts({
    j: () => {
      const next = Math.min(currentIndex + 1, articles.length - 1)
      if (articles[next]) setSelectedArticle(articles[next].id)
    },
    k: () => {
      const prev = Math.max(currentIndex - 1, 0)
      if (articles[prev]) setSelectedArticle(articles[prev].id)
    },
    'Shift+A': () => {
      const ids = articles.map(a => a.id)
      if (ids.length) batchMutation.mutate({ article_ids: ids, action: 'read' })
    },
  })

  const handleMarkAllRead = () => {
    const ids = articles.filter(a => !a.is_read).map(a => a.id)
    if (ids.length) batchMutation.mutate({ article_ids: ids, action: 'read' })
  }

  const unreadCount = articles.filter(a => !a.is_read).length

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface-0)' }}>

      {/* 顶部工具栏 */}
      <div
        className="flex-shrink-0 px-4 py-2.5 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {/* 过滤器标签 */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value as any)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-100',
                filterStatus === opt.value
                  ? 'bg-accent-subtle text-accent-text'
                  : 'text-muted hover:text-primary'
              )}
              style={filterStatus === opt.value
                ? { background: 'var(--accent-subtle)', color: 'var(--accent-text)' }
                : { color: 'var(--text-muted)' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* 右侧操作 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleMarkAllRead}
            className="btn-icon"
            title="全部标记已读 (Shift+A)"
            disabled={unreadCount === 0}
          >
            <CheckCheck size={14} />
          </button>

          <button
            onClick={() => refetch()}
            className="btn-icon"
            title="刷新"
          >
            <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
          </button>

          {/* 视图切换 */}
          <div
            className="flex items-center rounded-lg p-0.5 ml-1"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
          >
            {VIEW_MODES.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id as any)}
                className={cn('btn-icon w-6 h-6 rounded-md', viewMode === id && 'active')}
                style={viewMode === id
                  ? { background: 'var(--surface-0)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                  : {}
                }
                title={id === 'list' ? '列表视图' : '卡片视图'}
              >
                <Icon size={13} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 文章数量提示 */}
      {total > 0 && (
        <div
          className="flex-shrink-0 px-4 py-1.5 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
            {total} 篇
            {unreadCount > 0 && <span style={{ color: 'var(--accent-text)', marginLeft: '4px' }}>{unreadCount} 未读</span>}
          </span>
        </div>
      )}

      {/* 文章列表内容 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="empty-state">
            <RefreshCw size={20} className="animate-spin mb-2" />
            <p className="text-[12px]">加载中...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <div className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
              style={{ background: 'var(--surface-1)' }}>
              <RefreshCw size={20} style={{ color: 'var(--text-disabled)' }} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>暂无文章</p>
            <p className="text-[11.5px] mt-1" style={{ color: 'var(--text-disabled)' }}>
              添加订阅源或刷新试试
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 gap-2 p-3">
            {articles.map(article => (
              <ArticleCard
                key={article.id}
                article={article as any}
                selected={article.id === selectedArticleId}
                onClick={() => setSelectedArticle(article.id)}
              />
            ))}
          </div>
        ) : (
          <div>
            {articles.map(article => (
              <ArticleRow
                key={article.id}
                article={article as any}
                selected={article.id === selectedArticleId}
                onClick={() => setSelectedArticle(article.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
