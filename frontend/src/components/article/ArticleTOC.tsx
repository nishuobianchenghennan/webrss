/**
 * 文章大纲组件 - 解析文章标题生成目录，悬浮在右上角
 */

import { useEffect, useState, useRef } from 'react'
import { List, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TocItem {
  id: string
  text: string
  level: number
}

interface ArticleTOCProps {
  contentRef: React.RefObject<HTMLDivElement | null>
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}

export default function ArticleTOC({ contentRef, scrollContainerRef }: ArticleTOCProps) {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [open, setOpen] = useState(false)

  // 解析内容区标题
  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const headings = container.querySelectorAll('h1,h2,h3,h4')
    const tocItems: TocItem[] = []
    headings.forEach((el, idx) => {
      const id = `toc-heading-${idx}`
      el.id = id
      const level = parseInt(el.tagName[1])
      tocItems.push({ id, text: el.textContent || '', level })
    })
    setItems(tocItems)
    setActiveId(tocItems[0]?.id || '')
  }, [contentRef.current?.innerHTML])

  // 监听滚动，高亮当前标题
  useEffect(() => {
    const scrollEl = scrollContainerRef.current
    if (!scrollEl || items.length === 0) return

    const handleScroll = () => {
      const offsets = items.map(item => {
        const el = document.getElementById(item.id)
        return el ? el.getBoundingClientRect().top : Infinity
      })
      const passedIdx = offsets.reduce((best, top, idx) => {
        return top <= 80 ? idx : best
      }, 0)
      setActiveId(items[passedIdx]?.id || '')
    }

    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', handleScroll)
  }, [items, scrollContainerRef])

  // 大纲为空则不渲染
  if (items.length === 0) return null

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    const scrollEl = scrollContainerRef.current
    if (!el || !scrollEl) return
    const elTop = el.getBoundingClientRect().top
    const containerTop = scrollEl.getBoundingClientRect().top
    scrollEl.scrollBy({ top: elTop - containerTop - 72, behavior: 'smooth' })
    setOpen(false)
  }

  return (
    <div className="absolute top-3 right-3 z-20">
      {/* 触发按钮 */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
          open
            ? 'text-[var(--accent)] bg-[var(--accent-subtle)]'
            : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
        )}
        title="文章大纲"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        <List size={13} />
        <span>大纲</span>
      </button>

      {/* 大纲面板 */}
      {open && (
        <div
          className="absolute right-0 mt-1 w-56 rounded-xl shadow-lg overflow-hidden"
          style={{
            background: 'var(--surface-0)',
            border: '1px solid var(--border)',
            maxHeight: '60vh',
          }}
        >
          {/* 标题栏 */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>文章大纲</span>
            <button
              onClick={() => setOpen(false)}
              className="p-0.5 rounded"
              style={{ color: 'var(--text-disabled)' }}
            >
              <X size={12} />
            </button>
          </div>

          {/* 目录列表 */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(60vh - 36px)' }}>
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-[12px] leading-snug transition-colors truncate block',
                  item.id === activeId
                    ? 'font-medium'
                    : 'hover:bg-[var(--surface-1)]'
                )}
                style={{
                  paddingLeft: `${(item.level - 1) * 12 + 12}px`,
                  color: item.id === activeId ? 'var(--accent)' : 'var(--text-muted)',
                  background: item.id === activeId ? 'var(--accent-subtle)' : undefined,
                }}
              >
                {item.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
