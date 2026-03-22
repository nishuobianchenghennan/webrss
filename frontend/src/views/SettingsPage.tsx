/**
 * 设置页面布局 - 多分类导航
 */

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  Database,
  Keyboard,
  Palette,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SETTING_SECTIONS = [
  { to: '/settings/general', label: '基础设置', icon: Settings2 },
  { to: '/settings/ai', label: 'AI 模型设置', icon: Bot },
  { to: '/settings/shortcuts', label: '快捷键', icon: Keyboard },
  { to: '/settings/data', label: '数据管理', icon: Database },
  { to: '/settings/theme', label: '主题设置', icon: Palette },
] as const

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <div className="max-w-[1120px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="btn-icon">
            <ArrowLeft size={17} />
          </button>
          <div>
            <h1 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              设置
            </h1>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              按模块管理账号、AI、主题与数据能力
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] items-start">
          <aside
            className="rounded-2xl p-2 lg:sticky lg:top-6"
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <nav className="space-y-1">
              {SETTING_SECTIONS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn('nav-item w-full', isActive && 'active')
                  }
                >
                  <Icon size={14} className="flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
