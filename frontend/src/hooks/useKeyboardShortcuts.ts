/**
 * 键盘快捷键 Hook
 */

import { useEffect } from 'react'

interface ShortcutMap {
  [key: string]: () => void
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 如果焦点在输入框内，不触发快捷键
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (target.contentEditable === 'true') return

      const key = [
        e.ctrlKey && 'ctrl',
        e.metaKey && 'meta',
        e.shiftKey && 'shift',
        e.altKey && 'alt',
        e.key,
      ].filter(Boolean).join('+')

      if (shortcuts[key]) {
        e.preventDefault()
        shortcuts[key]()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts])
}
