/**
 * 日期格式化工具
 */

import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

export type ArticleTimeGroupKey = 'today' | 'week' | 'month' | 'year' | 'earlier'

export interface ArticleTimeCarrier {
  published_at?: string | null
  fetched_at?: string | null
}

export interface ArticleTimeGroup<T> {
  key: ArticleTimeGroupKey
  label: string
  articles: T[]
}

/**
 * 解析 ISO 日期字符串
 */
function parseDateValue(dateStr?: string | null): Date | null {
  if (!dateStr) return null

  try {
    const date = parseISO(dateStr)
    return isValid(date) ? date : null
  } catch {
    return null
  }
}

/**
 * 获取文章用于时间展示的日期
 */
export function getArticleDate(article: ArticleTimeCarrier): Date | null {
  return parseDateValue(article.published_at) || parseDateValue(article.fetched_at)
}

/**
 * 获取文章用于时间展示的原始时间字符串
 */
export function getArticleDateString(article: ArticleTimeCarrier): string | null {
  return article.published_at || article.fetched_at || null
}

/**
 * 获取完整时间格式
 */
export function formatDateTimeFull(dateStr?: string | null): string {
  if (!dateStr) return ''

  const date = parseDateValue(dateStr)
  if (!date) return dateStr
  return format(date, 'yyyy年MM月dd日 HH:mm:ss')
}

/**
 * 获取时间分组标签
 */
export function getArticleTimeGroupLabel(group: ArticleTimeGroupKey): string {
  const labels: Record<ArticleTimeGroupKey, string> = {
    today: '今天',
    week: '本周',
    month: '本月',
    year: '今年',
    earlier: '更早',
  }

  return labels[group]
}

/**
 * 按当前时间标尺对文章进行分组
 */
export function groupArticlesByTime<T extends ArticleTimeCarrier>(
  articles: T[],
  now: Date = new Date()
): ArticleTimeGroup<T>[] {
  const startOfToday = startOfDay(now)
  const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 })
  const startOfThisMonth = startOfMonth(now)
  const startOfThisYear = startOfYear(now)
  const grouped = new Map<ArticleTimeGroupKey, T[]>()

  for (const article of articles) {
    const articleDate = getArticleDate(article)
    let groupKey: ArticleTimeGroupKey = 'earlier'

    if (articleDate) {
      if (articleDate >= startOfToday) {
        groupKey = 'today'
      } else if (articleDate >= startOfThisWeek) {
        groupKey = 'week'
      } else if (articleDate >= startOfThisMonth) {
        groupKey = 'month'
      } else if (articleDate >= startOfThisYear) {
        groupKey = 'year'
      }
    }

    const currentGroup = grouped.get(groupKey) || []
    currentGroup.push(article)
    grouped.set(groupKey, currentGroup)
  }

  return (['today', 'week', 'month', 'year', 'earlier'] as ArticleTimeGroupKey[])
    .map((key) => ({
      key,
      label: getArticleTimeGroupLabel(key),
      articles: grouped.get(key) || [],
    }))
    .filter((group) => group.articles.length > 0)
}

/**
 * 格式化相对时间（如：2小时前）
 */
export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    return formatDistanceToNow(date, { addSuffix: true, locale: zhCN })
  } catch {
    return dateStr
  }
}

/**
 * 格式化文章发布时间（友好显示）
 */
export function formatPublishedAt(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    if (isToday(date)) return `今天 ${format(date, 'HH:mm')}`
    if (isYesterday(date)) return `昨天 ${format(date, 'HH:mm')}`
    return format(date, 'MM月dd日 HH:mm')
  } catch {
    return dateStr
  }
}

/**
 * 格式化阅读时间（如：3分钟）
 */
export function formatReadingTime(seconds: number): string {
  if (!seconds) return ''
  const minutes = Math.ceil(seconds / 60)
  return `${minutes}分钟阅读`
}

/**
 * 格式化字数
 */
export function formatWordCount(count: number): string {
  if (!count) return ''
  if (count > 10000) return `${(count / 10000).toFixed(1)}万字`
  return `${count}字`
}
