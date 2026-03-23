/**
 * 文章大纲组件 - 解析文章标题生成目录，固定在详情区右上角
 */

import { useEffect, useState } from 'react'
import { List, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TocItem {
  id: string
  text: string
  level: number
}

interface ArticleTOCProps {
  contentRef: React.RefObject<HTMLElement | null>
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  iframeRef?: React.RefObject<HTMLIFrameElement | null>
}

export default function ArticleTOC({ contentRef, scrollContainerRef, iframeRef }: ArticleTOCProps) {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const headings = Array.from(container.querySelectorAll('h1,h2,h3,h4'))
    const tocItems = headings.map((element, index) => {
      const id = `toc-heading-${index}`
      element.id = id

      return {
        id,
        text: element.textContent || '',
        level: Number(element.tagName.slice(1)),
      }
    })

    setItems(tocItems)
    setActiveId(tocItems[0]?.id || '')
  }, [contentRef.current?.innerHTML])

  useEffect(() => {
    const scrollElement = scrollContainerRef.current
    if (!scrollElement || items.length === 0) return

    const handleScroll = () => {
      const containerTop = scrollElement.getBoundingClientRect().top
      const nextActiveItem = items.reduce<TocItem | null>((currentItem, item) => {
        // 优先在 iframe 内部查找，回退到外层 document
        const iframeDoc = iframeRef?.current?.contentDocument
        const element = iframeDoc
          ? iframeDoc.getElementById(item.id)
          : document.getElementById(item.id)
        if (!element) return currentItem

        const relativeTop = element.getBoundingClientRect().top - containerTop
        return relativeTop <= 96 ? item : currentItem
      }, items[0] || null)

      setActiveId(nextActiveItem?.id || '')
    }

    handleScroll()
    scrollElement.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [items, scrollContainerRef])

  if (items.length === 0) return null

  const scrollToHeading = (id: string) => {
    const iframeDoc = iframeRef?.current?.contentDocument
    const iframeEl = iframeRef?.current
    const scrollElement = scrollContainerRef.current
    if (!scrollElement) return

    if (iframeDoc && iframeEl) {
      // iframe 模式：先将外层滚动到 iframe 顶部，再在 iframe 内部滚动到标题
      const element = iframeDoc.getElementById(id)
      if (!element) return
      const iframeTop = iframeEl.getBoundingClientRect().top
      const containerTop = scrollElement.getBoundingClientRect().top
      // 先滚到 iframe 在视口中的位置
      scrollElement.scrollBy({ top: iframeTop - containerTop - 72, behavior: 'smooth' })
      // 再在 iframe 内部滚动到目标标题
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      const element = document.getElementById(id)
      if (!element) return
      const elementTop = element.getBoundingClientRect().top
      const containerTop = scrollElement.getBoundingClientRect().top
      scrollElement.scrollBy({ top: elementTop - containerTop - 72, behavior: 'smooth' })
    }
    setOpen(false)
  }

  return (
    <div className="hidden xl:block absolute top-5 right-5 z-20">
      <button
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors shadow-sm',
          open
            ? 'text-[var(--accent)] bg-[var(--accent-subtle)]'
            : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
        )}
        title="文章大纲"
        style={{
          border: '1px solid var(--border-subtle)',
          background: open ? 'var(--accent-subtle)' : 'var(--surface-0)',
        }}
      >
        <List size={13} />
        <span>大纲</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-60 rounded-xl shadow-lg overflow-hidden"
          style={{
            background: 'var(--surface-0)',
            border: '1px solid var(--border)',
            maxHeight: 'calc(100vh - 180px)',
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              文章大纲
            </span>
            <button
              onClick={() => setOpen(false)}
              className="p-0.5 rounded"
              style={{ color: 'var(--text-disabled)' }}
            >
              <X size={12} />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToHeading(item.id)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-[12px] leading-snug transition-colors truncate block',
                  item.id === activeId ? 'font-medium' : 'hover:bg-[var(--surface-1)]'
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
