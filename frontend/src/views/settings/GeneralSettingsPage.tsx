/**
 * 基础设置页面
 */

import { LogOut, Monitor, Moon, Sun, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SettingsSection } from './SettingsSection'
import { useAuthStore, usePreferenceStore } from '@/stores'

const themes = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
] as const

export default function GeneralSettingsPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const { theme, setTheme } = usePreferenceStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="space-y-4">
      <SettingsSection title="账号信息" description="查看当前登录账号并执行安全退出。">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-semibold flex-shrink-0"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
          >
            {user?.username?.[0]?.toUpperCase() || <User size={16} />}
          </div>
          <div>
            <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {user?.username}
            </p>
            {user?.email && (
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {user.email}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-100"
          style={{ color: 'var(--danger)' }}
        >
          <LogOut size={13} />
          退出登录
        </button>
      </SettingsSection>

      <SettingsSection title="显示模式" description="切换浅色、深色或跟随系统。">
        <div className="grid gap-2 sm:grid-cols-3">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className="flex flex-col items-center gap-2 py-3 rounded-xl text-[12.5px] font-medium transition-all duration-100"
              style={theme === value
                ? {
                    background: 'var(--accent-subtle)',
                    color: 'var(--accent-text)',
                    border: '1.5px solid var(--accent)',
                  }
                : {
                    background: 'var(--surface-2)',
                    color: 'var(--text-muted)',
                    border: '1.5px solid transparent',
                  }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </SettingsSection>
    </div>
  )
}
