/**
 * 文章行组件 - Claude 风格设计（列表视图）
 */

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/date'
import type { Article } from '@rss-plus/shared'

interface ArticleRowProps {
  article: Article & { feed_title?: string; feed_favicon?: string }
  selected: boolean
  onClick: () => void
}

export default function ArticleRow({ article, selected, onClick }: ArticleRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'article-item',
        selected && 'selected',
        !article.is_read && 'unread'
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {/* 未读指示点 */}
        <div className="flex-shrink-0 mt-1.5 w-1.5">
          {!article.is_read && (
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          )}
        </div>

        {/* 主内容 */}
        <div className="flex-1 min-w-0">
          {/* 顶部：来源 + 时间 */}
          <div className="flex items-center gap-1.5 mb-1 min-w-0">
            {(article as any).feed_favicon && (
              <img
                src={(article as any).feed_favicon}
                alt=""
                className="w-3.5 h-3.5 rounded flex-shrink-0"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <span className="article-meta truncate flex-1">{(article as any).feed_title}</span>
            <span className="article-meta flex-shrink-0">{formatRelativeTime(article.published_at)}</span>
            {article.is_starred && (
              <Star size={11} fill="currentColor" style={{ color: '#f59e0b', flexShrink: 0 }} />
            )}
          </div>

          {/* 标题 */}
          <p className={cn('article-title', article.is_read && 'opacity-60')}>
            {article.title}
          </p>

          {/* 摘要 */}
          {article.summary && (
            <p className="article-summary opacity-75">{article.summary}</p>
          )}
        </div>

        {/* 封面图缩略图 */}
        {article.cover_image_url && (
          <img
            src={article.cover_image_url}
            alt=""
            className="flex-shrink-0 w-16 h-12 rounded-lg object-cover"
            style={{ opacity: article.is_read ? 0.5 : 1 }}
          />
        )}
      </div>
    </div>
  )
}
