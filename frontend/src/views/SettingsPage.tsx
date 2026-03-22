/**
 * 设置页面 - Claude 风格设计
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sun, Moon, Monitor, Download, Upload, LogOut, User, Keyboard, Database, Bot } from 'lucide-react'
import { useAuthStore, usePreferenceStore } from '@/stores'
import { feedApi } from '@/lib/api'
import { downloadBlob, cn } from '@/lib/utils'
import { useAiStore } from '@/stores/aiStore'

const SHORTCUTS = [
  ['J / K', '上/下一篇文章'],
  ['S', '收藏/取消收藏'],
  ['V', '打开原文'],
  ['Shift+A', '全部标记已读'],
  ['Escape', '关闭文章'],
] as const

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const { theme, setTheme } = usePreferenceStore()
  const { config: aiConfig, setConfig: setAiConfig } = useAiStore()
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleExportOPML = async () => {
    setExporting(true)
    try {
      const blob = await feedApi.exportOPML() as unknown as Blob
      downloadBlob(blob, 'rss-plus-feeds.opml')
    } catch {
      alert('导出失败')
    } finally {
      setExporting(false)
    }
  }

  const handleImportOPML = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const res = await feedApi.importOPML(text) as any
      alert(res.message || '导入成功')
    } catch (err: any) {
      alert(err?.message || '导入失败')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const themes = [
    { value: 'light', label: '浅色', icon: Sun },
    { value: 'dark', label: '深色', icon: Moon },
    { value: 'system', label: '跟随系统', icon: Monitor },
  ] as const

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <div className="max-w-[600px] mx-auto px-4 py-8">

        {/* 顶部导航 */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/')}
            className="btn-icon"
          >
            <ArrowLeft size={17} />
          </button>
          <h1
            className="text-[16px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            设置
          </h1>
        </div>

        <div className="space-y-3">

          {/* 账号卡片 */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <User size={13} style={{ color: 'var(--text-disabled)' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-disabled)' }}
              >
                账号
              </span>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-semibold flex-shrink-0"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent-text)' }}
                >
                  {user?.username?.[0]?.toUpperCase()}
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
                className="flex items-center gap-1.5 text-[13px] font-medium transition-colors duration-100"
                style={{ color: 'var(--danger)' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                <LogOut size={13} />
                退出登录
              </button>
            </div>
          </section>

          {/* 外观卡片 */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <Sun size={13} style={{ color: 'var(--text-disabled)' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-disabled)' }}
              >
                外观
              </span>
            </div>

            <div className="px-5 py-4">
              <div className="flex gap-2">
                {themes.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className="flex-1 flex flex-col items-center gap-2 py-3 rounded-xl text-[12.5px] font-medium transition-all duration-100"
                    style={theme === value ? {
                      background: 'var(--accent-subtle)',
                      color: 'var(--accent-text)',
                      border: '1.5px solid var(--accent)',
                    } : {
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
            </div>
          </section>

          {/* AI 助手配置卡片 */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <Bot size={13} style={{ color: 'var(--text-disabled)' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-disabled)' }}
              >
                AI 助手
              </span>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                使用 OpenAI 兼容格式，支持 OpenAI、DeepSeek、Claude 等任意兼容接口。
              </p>

              {/* API Key */}
              <div>
                <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={e => setAiConfig({ apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                  style={{
                    background: 'var(--surface-0)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  API Base URL
                </label>
                <input
                  type="text"
                  value={aiConfig.baseUrl}
                  onChange={e => setAiConfig({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                  style={{
                    background: 'var(--surface-0)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* 模型 */}
              <div>
                <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  模型
                </label>
                <input
                  type="text"
                  value={aiConfig.model}
                  onChange={e => setAiConfig({ model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                  style={{
                    background: 'var(--surface-0)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </section>

          {/* 数据管理卡片 */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <Database size={13} style={{ color: 'var(--text-disabled)' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-disabled)' }}
              >
                数据管理
              </span>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {/* 导入 OPML */}
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    导入 OPML
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    从其他阅读器导入订阅列表
                  </p>
                </div>
                <label
                  className={cn('btn-secondary cursor-pointer flex items-center gap-1.5 text-[12.5px]', importing && 'opacity-50 pointer-events-none')}
                >
                  <Upload size={13} />
                  {importing ? '导入中...' : '选择文件'}
                  <input
                    type="file"
                    accept=".opml,.xml"
                    className="hidden"
                    onChange={handleImportOPML}
                    disabled={importing}
                  />
                </label>
              </div>

              {/* 导出 OPML */}
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    导出 OPML
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    导出订阅列表备份
                  </p>
                </div>
                <button
                  onClick={handleExportOPML}
                  disabled={exporting}
                  className="btn-secondary flex items-center gap-1.5 text-[12.5px]"
                >
                  <Download size={13} />
                  {exporting ? '导出中...' : '导出'}
                </button>
              </div>
            </div>
          </section>

          {/* 键盘快捷键卡片 */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
          >
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <Keyboard size={13} style={{ color: 'var(--text-disabled)' }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-disabled)' }}
              >
                键盘快捷键
              </span>
            </div>

            <div className="px-5 py-3">
              {SHORTCUTS.map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                    {desc}
                  </span>
                  <kbd
                    className="px-2 py-0.5 text-[11.5px] font-mono rounded-md"
                    style={{
                      background: 'var(--surface-2)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {key}
                  </kbd>
                </div>
              ))}
              {/* 最后一项无下边框 */}
              <div className="py-2" />
            </div>
          </section>

        </div>

        {/* 版本信息 */}
        <p
          className="text-center text-[11.5px] mt-8"
          style={{ color: 'var(--text-disabled)' }}
        >
          RSS Plus v1.0.0 · 基于 Cloudflare 全家桶构建
        </p>
      </div>
    </div>
  )
}
