/**
 * 日期格式化工具
 */

import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'

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
