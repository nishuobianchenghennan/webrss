/**
 * 文章详情组件 - Claude 风格设计
 */

import { useEffect, useRef, useState } from 'react'
import { Star, ExternalLink, BookOpen, Clock, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReadingStore } from '@/stores'
import { useArticle, useMarkRead, useToggleStar } from '@/hooks/useArticles'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { formatPublishedAt, formatReadingTime, formatWordCount } from '@/lib/date'
import ArticleTOC from '@/components/article/ArticleTOC'

export default function ArticleDetail() {
  const { selectedArticleId, setSelectedArticle } = useReadingStore()
  const { data: articleData, isLoading } = useArticle(selectedArticleId)
  const article = (articleData as any)?.data || articleData
  const markRead = useMarkRead()
  const toggleStar = useToggleStar()
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  // 自动标记已读
  useEffect(() => {
    if (article && !article.is_read) {
      markRead.mutate(article.id)
    }
  }, [article?.id])

  useKeyboardShortcuts({
    s: () => article && toggleStar.mutate(article.id),
    v: () => article?.url && window.open(article.url, '_blank'),
    Escape: () => setSelectedArticle(null),
  })

  // 监听滚动，顶部工具栏加边框
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrolled(event.currentTarget.scrollTop > 10)
  }

  // 供 ArticleTOC 使用的滚动容器 ref 同步
  const handleScrollRef = (element: HTMLDivElement | null) => {
    ;(scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = element
  }

  if (!selectedArticleId) {
    return (
      <div className="flex-1 empty-state" style={{ background: 'var(--surface-0)' }}>
        <div
          className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center"
          style={{ background: 'var(--surface-1)' }}
        >
          <BookOpen size={28} style={{ color: 'var(--text-disabled)' }} />
        </div>
        <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          选择一篇文章开始阅读
        </p>
        <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>
          使用 <kbd>J</kbd> / <kbd>K</kbd> 键可快速导航文章列表
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 empty-state" style={{ background: 'var(--surface-0)' }}>
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
        />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex-1 empty-state" style={{ background: 'var(--surface-0)' }}>
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          文章不存在
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ background: 'var(--surface-0)' }}>
      {/* 顶部操作栏 */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center justify-between px-5 py-2.5 transition-shadow duration-200',
          scrolled && 'shadow-subtle'
        )}
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-0)' }}
      >
        {/* 返回按钮（移动端） */}
        <button onClick={() => setSelectedArticle(null)} className="btn-icon md:hidden">
          <ArrowLeft size={16} />
        </button>

        <div className="hidden md:block" />

        {/* 右侧操作 */}
        <div className="flex items-center gap-0.5">
          {/* 收藏 */}
          <button
            onClick={() => toggleStar.mutate(article.id)}
            className={cn('btn-icon', article.is_starred && 'active')}
            title="收藏 (S)"
            style={article.is_starred ? { color: '#f59e0b', background: '#fef3c7' } : {}}
          >
            <Star size={15} fill={article.is_starred ? 'currentColor' : 'none'} />
          </button>

          {/* 原文链接 */}
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-icon"
              title="打开原文 (V)"
            >
              <ExternalLink size={15} />
            </a>
          )}
        </div>
      </div>

      {/* 文章正文区 */}
      <div className="flex-1 min-h-0 relative">
        <ArticleTOC contentRef={contentRef} scrollContainerRef={scrollContainerRef} />

        <div
          ref={handleScrollRef}
          className="h-full overflow-y-auto"
          onScroll={handleScroll}
        >
          <div className="max-w-[980px] mx-auto px-6 py-10 lg:px-10 xl:pr-[280px]">
            {/* 文章元信息 */}
            <div className="mb-8">
              {/* 来源信息 */}
              <div className="flex items-center gap-2 mb-4">
                {article.feed_favicon && (
                  <img
                    src={article.feed_favicon}
                    alt=""
                    className="w-5 h-5 rounded"
                    onError={(event) => {
                      ;(event.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
                <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {article.feed_title}
                </span>
                {article.author && (
                  <>
                    <span style={{ color: 'var(--text-disabled)' }}>·</span>
                    <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                      {article.author}
                    </span>
                  </>
                )}
              </div>

              {/* 标题 */}
              <h1
                className="text-[24px] font-bold leading-tight mb-4"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'Inter, "Noto Sans SC", sans-serif',
                  letterSpacing: '-0.03em',
                }}
              >
                {article.title}
              </h1>

              {/* 元数据行 */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {article.published_at && (
                  <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                    {formatPublishedAt(article.published_at)}
                  </span>
                )}
                {article.reading_time > 0 && (
                  <span className="flex items-center gap-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    {formatReadingTime(article.reading_time)}
                  </span>
                )}
                {article.word_count > 0 && (
                  <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                    {formatWordCount(article.word_count)}
                  </span>
                )}
              </div>
            </div>

            {/* 封面图 */}
            {article.cover_image_url && (
              <div className="mb-8 -mx-2">
                <img
                  src={article.cover_image_url}
                  alt=""
                  className="w-full object-cover"
                  style={{ borderRadius: '12px', maxHeight: '360px' }}
                />
              </div>
            )}

            {/* 分割线 */}
            <div className="mb-8" style={{ height: '1px', background: 'var(--border-subtle)' }} />

            {/* 文章正文 */}
            {article.content ? (
              <div
                ref={contentRef}
                className="article-content max-w-[680px]"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            ) : article.summary ? (
              <div ref={contentRef} className="space-y-4 max-w-[680px]">
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: article.summary }}
                />
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 btn-primary mt-4"
                    style={{ borderRadius: '10px' }}
                  >
                    阅读完整原文 <ExternalLink size={13} />
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center py-12 max-w-[680px]">
                <p className="text-[13px] mb-3" style={{ color: 'var(--text-muted)' }}>
                  暂无正文内容
                </p>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex"
                    style={{ borderRadius: '10px' }}
                  >
                    前往原文 <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}

            {/* 底部间距 */}
            <div className="h-16" />
          </div>
        </div>
      </div>
    </div>
  )
}
