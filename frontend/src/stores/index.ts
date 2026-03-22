/**
 * 全局状态管理 - Zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@rss-plus/shared'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedThemeMode = 'light' | 'dark'
export type ThemeToken =
  | 'surface-0'
  | 'surface-1'
  | 'surface-2'
  | 'border'
  | 'border-subtle'
  | 'text-primary'
  | 'text-secondary'
  | 'text-muted'
  | 'text-disabled'
  | 'accent'
  | 'accent-hover'
  | 'accent-subtle'
  | 'accent-text'
  | 'danger'
  | 'danger-subtle'
  | 'success'
  | 'success-subtle'
  | 'warning'
  | 'warning-subtle'

export type ThemePalette = Record<ThemeToken, string>
export type ThemePaletteOverrides = Record<ResolvedThemeMode, Partial<ThemePalette>>

export const THEME_TOKEN_GROUPS: Array<{
  title: string
  tokens: Array<{ key: ThemeToken; label: string }>
}> = [
  {
    title: '背景',
    tokens: [
      { key: 'surface-0', label: '页面背景' },
      { key: 'surface-1', label: '卡片背景' },
      { key: 'surface-2', label: '悬浮背景' },
    ],
  },
  {
    title: '边框',
    tokens: [
      { key: 'border', label: '主边框' },
      { key: 'border-subtle', label: '弱边框' },
    ],
  },
  {
    title: '文本',
    tokens: [
      { key: 'text-primary', label: '主文本' },
      { key: 'text-secondary', label: '次文本' },
      { key: 'text-muted', label: '弱文本' },
      { key: 'text-disabled', label: '禁用文本' },
    ],
  },
  {
    title: '强调色',
    tokens: [
      { key: 'accent', label: '强调色' },
      { key: 'accent-hover', label: '强调悬浮' },
      { key: 'accent-subtle', label: '强调浅底' },
      { key: 'accent-text', label: '强调文字' },
    ],
  },
  {
    title: '状态色',
    tokens: [
      { key: 'danger', label: '危险色' },
      { key: 'danger-subtle', label: '危险浅底' },
      { key: 'success', label: '成功色' },
      { key: 'success-subtle', label: '成功浅底' },
      { key: 'warning', label: '警告色' },
      { key: 'warning-subtle', label: '警告浅底' },
    ],
  },
]

export const DEFAULT_THEME_PALETTES: Record<ResolvedThemeMode, ThemePalette> = {
  light: {
    'surface-0': '#faf9f7',
    'surface-1': '#f3f1ec',
    'surface-2': '#e8e4db',
    border: '#d6d0c4',
    'border-subtle': '#e8e4db',
    'text-primary': '#1a1714',
    'text-secondary': '#4a4234',
    'text-muted': '#7d7060',
    'text-disabled': '#b8af9e',
    accent: '#444ce7',
    'accent-hover': '#3538cd',
    'accent-subtle': '#e0e9ff',
    'accent-text': '#2d31a6',
    danger: '#dc2626',
    'danger-subtle': '#fef2f2',
    success: '#16a34a',
    'success-subtle': '#f0fdf4',
    warning: '#d97706',
    'warning-subtle': '#fffbeb',
  },
  dark: {
    'surface-0': '#16130f',
    'surface-1': '#1e1a14',
    'surface-2': '#27231b',
    border: '#3a3328',
    'border-subtle': '#2d2820',
    'text-primary': '#f5f3ef',
    'text-secondary': '#d6d0c4',
    'text-muted': '#9a8f7e',
    'text-disabled': '#625847',
    accent: '#818cf8',
    'accent-hover': '#a5bbfc',
    'accent-subtle': '#1e2040',
    'accent-text': '#a5bbfc',
    danger: '#f87171',
    'danger-subtle': '#2d1515',
    success: '#4ade80',
    'success-subtle': '#0f2310',
    warning: '#fbbf24',
    'warning-subtle': '#2d1f00',
  },
}

const DEFAULT_THEME_OVERRIDES: ThemePaletteOverrides = {
  light: {},
  dark: {},
}

// ===== 认证状态 =====
interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        set({ token, user })
      },
      logout: () => {
        set({ token: null, user: null })
      },
    }),
    { name: 'auth-storage', partialize: (state) => ({ token: state.token, user: state.user }) }
  )
)

// ===== 阅读状态 =====
type ViewMode = 'list' | 'card' | 'magazine' | 'compact'
type FilterStatus = 'all' | 'unread' | 'starred' | 'pinned'
export type TimePeriod = 'all' | 'today' | 'week' | 'month' | 'year'

interface ReadingState {
  selectedFeedId: string | null
  selectedCategoryId: string | null
  selectedArticleId: string | null
  filterStatus: FilterStatus
  timePeriod: TimePeriod
  viewMode: ViewMode
  sidebarCollapsed: boolean
  setSelectedFeed: (id: string | null) => void
  setSelectedCategory: (id: string | null) => void
  setSelectedArticle: (id: string | null) => void
  setFilterStatus: (status: FilterStatus) => void
  setTimePeriod: (period: TimePeriod) => void
  setViewMode: (mode: ViewMode) => void
  toggleSidebar: () => void
}

export const useReadingStore = create<ReadingState>()(
  persist(
    (set) => ({
      selectedFeedId: null,
      selectedCategoryId: null,
      selectedArticleId: null,
      filterStatus: 'all',
      timePeriod: 'all',
      viewMode: 'list',
      sidebarCollapsed: false,
      setSelectedFeed: (id) => set({ selectedFeedId: id, selectedCategoryId: null, selectedArticleId: null }),
      setSelectedCategory: (id) => set({ selectedCategoryId: id, selectedFeedId: null, selectedArticleId: null }),
      setSelectedArticle: (id) => set({ selectedArticleId: id }),
      setFilterStatus: (filterStatus) => set({ filterStatus }),
      setTimePeriod: (timePeriod) => set({ timePeriod }),
      setViewMode: (viewMode) => set({ viewMode }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'reading-state',
      partialize: (state) => ({ viewMode: state.viewMode, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
)

// ===== 偏好设置 =====
interface PreferenceState {
  theme: ThemeMode
  paletteOverrides: ThemePaletteOverrides
  setTheme: (theme: ThemeMode) => void
  setPaletteToken: (mode: ResolvedThemeMode, token: ThemeToken, value: string) => void
  resetPalette: (mode: ResolvedThemeMode) => void
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      paletteOverrides: DEFAULT_THEME_OVERRIDES,
      setTheme: (theme) => {
        set({ theme })
        applyThemePreferences(theme, get().paletteOverrides)
      },
      setPaletteToken: (mode, token, value) => {
        const nextOverrides = {
          ...get().paletteOverrides,
          [mode]: {
            ...get().paletteOverrides[mode],
            [token]: value,
          },
        }
        set({ paletteOverrides: nextOverrides })
        applyThemePreferences(get().theme, nextOverrides)
      },
      resetPalette: (mode) => {
        const nextOverrides = {
          ...get().paletteOverrides,
          [mode]: {},
        }
        set({ paletteOverrides: nextOverrides })
        applyThemePreferences(get().theme, nextOverrides)
      },
    }),
    { name: 'preferences' }
  )
)

export function getResolvedTheme(theme: ThemeMode): ResolvedThemeMode {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function getMergedPalette(
  mode: ResolvedThemeMode,
  paletteOverrides: ThemePaletteOverrides = DEFAULT_THEME_OVERRIDES
): ThemePalette {
  return {
    ...DEFAULT_THEME_PALETTES[mode],
    ...paletteOverrides[mode],
  }
}

function applyThemePreferences(theme: ThemeMode, paletteOverrides: ThemePaletteOverrides) {
  const root = document.documentElement
  const resolvedTheme = getResolvedTheme(theme)
  const palette = getMergedPalette(resolvedTheme, paletteOverrides)

  if (resolvedTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  for (const [token, value] of Object.entries(palette)) {
    root.style.setProperty(`--${token}`, value)
  }
}

// 初始化主题
if (typeof window !== 'undefined') {
  const readStoredPreferenceState = () => {
    const raw = localStorage.getItem('preferences')
    if (!raw) {
      return {
        theme: 'system' as ThemeMode,
        paletteOverrides: DEFAULT_THEME_OVERRIDES,
      }
    }

    try {
      const { state } = JSON.parse(raw)
      return {
        theme: (state?.theme || 'system') as ThemeMode,
        paletteOverrides: {
          light: state?.paletteOverrides?.light || {},
          dark: state?.paletteOverrides?.dark || {},
        } as ThemePaletteOverrides,
      }
    } catch {
      return {
        theme: 'system' as ThemeMode,
        paletteOverrides: DEFAULT_THEME_OVERRIDES,
      }
    }
  }

  const applyStoredPreferences = () => {
    const stored = readStoredPreferenceState()
    applyThemePreferences(stored.theme, stored.paletteOverrides)
  }

  applyStoredPreferences()

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleThemeChange = () => {
    const stored = readStoredPreferenceState()
    if (stored.theme === 'system') {
      applyThemePreferences(stored.theme, stored.paletteOverrides)
    }
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleThemeChange)
  } else {
    mediaQuery.addListener(handleThemeChange)
  }
}
