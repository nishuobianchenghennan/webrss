/**
 * 全局状态管理 - Zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Article, Feed, Category } from '@rss-plus/shared'

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
    { name: 'auth-storage', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
)

// ===== 阅读状态 =====
type ViewMode = 'list' | 'card' | 'magazine' | 'compact'
type FilterStatus = 'all' | 'unread' | 'starred' | 'pinned'

interface ReadingState {
  selectedFeedId: string | null
  selectedCategoryId: string | null
  selectedArticleId: string | null
  filterStatus: FilterStatus
  viewMode: ViewMode
  sidebarCollapsed: boolean
  setSelectedFeed: (id: string | null) => void
  setSelectedCategory: (id: string | null) => void
  setSelectedArticle: (id: string | null) => void
  setFilterStatus: (status: FilterStatus) => void
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
      viewMode: 'list',
      sidebarCollapsed: false,
      setSelectedFeed: (id) => set({ selectedFeedId: id, selectedCategoryId: null, selectedArticleId: null }),
      setSelectedCategory: (id) => set({ selectedCategoryId: id, selectedFeedId: null, selectedArticleId: null }),
      setSelectedArticle: (id) => set({ selectedArticleId: id }),
      setFilterStatus: (filterStatus) => set({ filterStatus }),
      setViewMode: (viewMode) => set({ viewMode }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'reading-state', partialize: (s) => ({ viewMode: s.viewMode, sidebarCollapsed: s.sidebarCollapsed }) }
  )
)

// ===== 偏好设置 =====
interface PreferenceState {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
    }),
    { name: 'preferences' }
  )
)

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// 初始化主题
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('preferences')
  if (stored) {
    const { state } = JSON.parse(stored)
    applyTheme(state?.theme || 'system')
  }
}
