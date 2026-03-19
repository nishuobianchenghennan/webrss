/**
 * 工具函数
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并Tailwind类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

/**
 * 获取域名
 */
export function getDomain(url?: string | null): string {
  if (!url) return ''
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * 下载Blob为文件
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
