/**
 * 文章列表组件 - Claude 风格设计
 */

import { useMemo } from 'react'
import { RefreshCw, CheckCheck, LayoutList, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReadingStore, type TimePeriod } from '@/stores'
import { useArticles, useBatchArticles } from '@/hooks/useArticles'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import ArticleRow from '@/components/article/ArticleRow'
import ArticleCard from '@/components/article/ArticleCard'
import { groupArticlesByTime } from '@/lib/date'
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

const TIME_PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '今年' },
]

/** 根据时间周期计算 since ISO 字符串 */
function getSince(period: TimePeriod): string | undefined {
  if (period === 'all') return undefined
  const now = new Date()
  if (period === 'today') {
    now.setHours(0, 0, 0, 0)
  } else if (period === 'week') {
    const currentDay = now.getDay()
    const dayOffset = currentDay === 0 ? 6 : currentDay - 1
    now.setDate(now.getDate() - dayOffset)
    now.setHours(0, 0, 0, 0)
  } else if (period === 'month') {
    now.setDate(1)
    now.setHours(0, 0, 0, 0)
  } else if (period === 'year') {
    now.setMonth(0, 1)
    now.setHours(0, 0, 0, 0)
  }
  return now.toISOString()
}

export default function ArticleList() {
  const {
    selectedFeedId,
    selectedCategoryId,
    filterStatus,
    timePeriod,
    setSelectedArticle,
    selectedArticleId,
    viewMode,
    setViewMode,
    setFilterStatus,
    setTimePeriod,
  } = useReadingStore()

  const params = {
    feed_id: selectedFeedId || undefined,
    category_id: selectedCategoryId || undefined,
    status: filterStatus,
    sort: 'newest' as const,
    limit: 50,
    since: getSince(timePeriod),
  }

  const { data, isLoading, refetch, isFetching } = useArticles(params)
  const batchMutation = useBatchArticles()
  const articles: Article[] = (data as any)?.records || []
  const total: number = (data as any)?.total || 0
  const groupedArticles = useMemo(() => groupArticlesByTime(articles), [articles])

  const currentIndex = articles.findIndex((article) => article.id === selectedArticleId)

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
      const articleIds = articles.map((article) => article.id)
      if (articleIds.length) batchMutation.mutate({ article_ids: articleIds, action: 'read' })
    },
  })

  const handleMarkAllRead = () => {
    const unreadIds = articles.filter((article) => !article.is_read).map((article) => article.id)
    if (unreadIds.length) batchMutation.mutate({ article_ids: unreadIds, action: 'read' })
  }

  const unreadCount = articles.filter((article) => !article.is_read).length

  const renderArticleItem = (article: Article) => {
    if (viewMode === 'card') {
      return (
        <ArticleCard
          key={article.id}
          article={article as any}
          selected={article.id === selectedArticleId}
          onClick={() => setSelectedArticle(article.id)}
        />
      )
    }

    return (
      <ArticleRow
        key={article.id}
        article={article as any}
        selected={article.id === selectedArticleId}
        onClick={() => setSelectedArticle(article.id)}
      />
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface-0)' }}>
      {/* 顶部工具栏 */}
      <div
        className="flex-shrink-0 px-4 py-2.5 flex flex-col gap-1.5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {/* 第一行：状态过滤 + 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 过滤器标签 */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value as any)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[12px] font-medium transition-all duration-100',
                  filterStatus === option.value
                    ? 'bg-accent-subtle text-accent-text'
                    : 'text-muted hover:text-primary'
                )}
                style={filterStatus === option.value
                  ? { background: 'var(--accent-subtle)', color: 'var(--accent-text)' }
                  : { color: 'var(--text-muted)' }}
              >
                {option.label}
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

            <button onClick={() => refetch()} className="btn-icon" title="刷新">
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
                    ? {
                        background: 'var(--surface-0)',
                        color: 'var(--text-primary)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }
                    : {}}
                  title={id === 'list' ? '列表视图' : '卡片视图'}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 第二行：时间周期筛选 */}
        <div className="flex items-center gap-1">
          {TIME_PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimePeriod(option.value)}
              className="px-2 py-0.5 rounded text-[11px] font-medium transition-all duration-100"
              style={timePeriod === option.value
                ? { background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
                : { color: 'var(--text-disabled)', border: '1px solid transparent' }}
            >
              {option.label}
            </button>
          ))}
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
            {unreadCount > 0 && (
              <span style={{ color: 'var(--accent-text)', marginLeft: '4px' }}>{unreadCount} 未读</span>
            )}
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
            <div
              className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center"
              style={{ background: 'var(--surface-1)' }}
            >
              <RefreshCw size={20} style={{ color: 'var(--text-disabled)' }} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
              暂无文章
            </p>
            <p className="text-[11.5px] mt-1" style={{ color: 'var(--text-disabled)' }}>
              添加订阅源或刷新试试
            </p>
          </div>
        ) : (
          <div className={viewMode === 'card' ? 'p-3 space-y-4' : 'py-2'}>
            {groupedArticles.map((group) => (
              <section key={group.key} className="min-w-0">
                <div
                  className={cn(
                    'sticky top-0 z-10 px-4 py-2 text-[11px] font-semibold tracking-[0.04em]',
                    viewMode === 'card' ? 'mb-2 rounded-xl' : ''
                  )}
                  style={{
                    background: 'color-mix(in srgb, var(--surface-0) 88%, transparent)',
                    backdropFilter: 'blur(8px)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {group.label}
                  <span className="ml-2 text-[10px]" style={{ color: 'var(--text-disabled)' }}>
                    {group.articles.length} 篇
                  </span>
                </div>

                {viewMode === 'card' ? (
                  <div className="grid grid-cols-1 gap-2">
                    {group.articles.map(renderArticleItem)}
                  </div>
                ) : (
                  <div>{group.articles.map(renderArticleItem)}</div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
