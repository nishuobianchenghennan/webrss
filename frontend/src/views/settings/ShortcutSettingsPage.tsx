/**
 * 快捷键设置页面
 */

import { SettingsSection } from './SettingsSection'

const SHORTCUTS = [
  ['J / K', '上/下一篇文章'],
  ['S', '收藏/取消收藏'],
  ['V', '打开原文'],
  ['Shift+A', '全部标记已读'],
  ['Escape', '关闭文章'],
] as const

export default function ShortcutSettingsPage() {
  return (
    <SettingsSection title="快捷键" description="当前阅读器内置快捷键如下。">
      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {SHORTCUTS.map(([key, description]) => (
          <div key={key} className="flex items-center justify-between py-3 gap-4">
            <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
              {description}
            </span>
            <kbd
              className="px-2.5 py-1 rounded-lg text-[12px] font-medium"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </SettingsSection>
  )
}
