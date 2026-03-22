/**
 * 新建分类对话框
 */

import { useState } from 'react'
import { X, FolderPlus } from 'lucide-react'
import { useCreateCategory } from '@/hooks/useCategories'

const PRESET_ICONS = ['📁', '📰', '🔬', '💻', '🎨', '📚', '🌍', '💰', '🎮', '🏃', '🎵', '🍽️']
const PRESET_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

interface AddCategoryDialogProps {
  onClose: () => void
}

export default function AddCategoryDialog({ onClose }: AddCategoryDialogProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const createCategory = useCreateCategory()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await createCategory.mutateAsync({ name: name.trim(), icon: icon || undefined, color })
      onClose()
    } catch (err: any) {
      alert(err?.message || '创建失败')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-xl overflow-hidden"
        style={{ background: 'var(--surface-0)', border: '1px solid var(--border)' }}
      >
        {/* 标题栏 */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <FolderPlus size={16} style={{ color: 'var(--accent)' }} />
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>新建分类</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* 分类名称 */}
          <div>
            <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              分类名称
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：科技、财经..."
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* 图标选择 */}
          <div>
            <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              图标（可选）
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ICONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(icon === emoji ? '' : emoji)}
                  className="w-8 h-8 rounded-lg text-base flex items-center justify-center transition-colors"
                  style={{
                    background: icon === emoji ? 'var(--accent-subtle)' : 'var(--surface-1)',
                    border: icon === emoji ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 颜色选择 */}
          <div>
            <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              颜色
            </label>
            <div className="flex gap-1.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 rounded-full transition-transform"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{ color: 'var(--text-muted)', background: 'var(--surface-1)' }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createCategory.isPending}
              className="btn-primary px-4 py-2 text-[13px]"
              style={{ borderRadius: '10px', opacity: !name.trim() ? 0.5 : 1 }}
            >
              {createCategory.isPending ? '创建中...' : '创建分类'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
