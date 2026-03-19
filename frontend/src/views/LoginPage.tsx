/**
 * 登录页面 - Claude 风格设计
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { authApi } from '@/lib/api'
import { Rss, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', password: '', email: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = mode === 'login'
        ? await authApi.login(form.username, form.password) as any
        : await authApi.register(form.username, form.password, form.email) as any

      if (res.code === 200 || res.code === 201) {
        setAuth(res.data.token, res.data.user)
        navigate('/')
      } else {
        setError(res.message || '操作失败')
      }
    } catch (err: any) {
      setError(err?.message || '请求失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex surface-0" style={{ background: 'var(--surface-0)' }}>
      {/* 左侧装饰区 - 仅大屏显示 */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-12"
        style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border-subtle)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent)' }}>
            <Rss size={16} className="text-white" />
          </div>
          <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            RSS Plus
          </span>
        </div>

        {/* 特性列表 */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold leading-tight mb-3"
              style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.03em' }}>
              现代化的信息阅读体验
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              基于 Cloudflare 全栈构建，零服务器成本，<br />让信息流动更纯粹。
            </p>
          </div>
          {[
            { icon: '⚡', title: '极速响应', desc: 'Edge Runtime，全球低延迟' },
            { icon: '🔒', title: '私有部署', desc: '数据完全掌控在你手中' },
            { icon: '♟️', title: '智能抓取', desc: '定时同步，支持 RSS/Atom/JSON Feed' },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-xl mt-0.5">{f.icon}</span>
              <div>
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{f.title}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
          RSS Plus v1.0 · 基于 Cloudflare Workers + D1 + R2
        </p>
      </div>

      {/* 右侧登录区 */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[360px]">
          {/* 移动端 Logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent)' }}>
              <Rss size={14} className="text-white" />
            </div>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>RSS Plus</span>
          </div>

          {/* 标题 */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-1.5"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {mode === 'login' ? '欢迎回来' : '创建账户'}
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {mode === 'login' ? '登录继续阅读你的信息流' : '开始你的 RSS 阅读之旅'}
            </p>
          </div>

          {/* 模式切换 */}
          <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={cn(
                  'flex-1 py-2 text-[13px] font-medium rounded-lg transition-all duration-150',
                  mode === m
                    ? 'shadow-subtle'
                    : 'opacity-60 hover:opacity-80'
                )}
                style={mode === m ? { background: 'var(--surface-0)', color: 'var(--text-primary)' } : { color: 'var(--text-secondary)' }}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                用户名
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="your_username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  邮箱 <span style={{ color: 'var(--text-disabled)' }}>（可选）</span>
                </label>
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="input pr-10"
                  placeholder="至少 6 位"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-100"
                  style={{ color: 'var(--text-disabled)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-disabled)')}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12.5px] animate-fade-in"
                style={{ background: 'var(--danger-subtle)', color: 'var(--danger)' }}>
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-1 text-[13.5px]"
              style={{ borderRadius: '10px' }}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> 处理中...</>
                : <>{mode === 'login' ? '登录' : '创建账户'} <ArrowRight size={14} /></>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
