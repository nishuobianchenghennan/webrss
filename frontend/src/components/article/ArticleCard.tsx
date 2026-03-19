/**
 * 文章卡片组件 - Claude 风格设计（卡片视图）
 */

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/date'
import type { Article } from '@rss-plus/shared'

interface ArticleCardProps {
  article: Article & { feed_title?: string; feed_favicon?: string }
  selected: boolean
  onClick: () => void
}

export default function ArticleCard({ article, selected, onClick }: ArticleCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn('article-card', selected && 'selected')}
    >
      <div className="flex items-start gap-3 min-w-0">
        {/* 未读指示 */}
        <div className="flex-shrink-0 mt-1.5 w-1.5">
          {!article.is_read && (
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* 来源信息 */}
          <div className="flex items-center gap-1.5 mb-1.5">
            {(article as any).feed_favicon && (
              <img
                src={(article as any).feed_favicon}
                alt=""
                className="w-3.5 h-3.5 rounded"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <span className="article-meta truncate flex-1">{(article as any).feed_title}</span>
            <span className="article-meta">{formatRelativeTime(article.published_at)}</span>
            {article.is_starred && (
              <Star size={11} fill="currentColor" style={{ color: '#f59e0b' }} />
            )}
          </div>

          {/* 标题 */}
          <p className={cn('article-title line-clamp-2', article.is_read && 'opacity-55')}>
            {article.title}
          </p>

          {/* 摘要 */}
          {article.summary && (
            <p className="text-[11.5px] mt-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {article.summary}
            </p>
          )}
        </div>

        {/* 封面图 */}
        {article.cover_image_url && (
          <img
            src={article.cover_image_url}
            alt=""
            className="flex-shrink-0 w-16 h-14 rounded-lg object-cover"
            style={{ opacity: article.is_read ? 0.45 : 1 }}
          />
        )}
      </div>
    </div>
  )
}
