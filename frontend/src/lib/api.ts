/**
 * API 客户端 - 封装 axios 请求
 */

import axios, { type AxiosInstance } from 'axios'
import type {
  ApiResponse, PaginatedResponse,
  Feed, Article, Category, Tag, ArticleQuery,
  User, AuthResponse, DiscoveredFeed, BatchArticleOperation
} from '@rss-plus/shared'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

// 请求拦截器：注入Token（从 Zustand persist 存储中读取）
http.interceptors.request.use((config) => {
  const raw = localStorage.getItem('auth-storage')
  const token = raw ? JSON.parse(raw)?.state?.token : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：统一处理错误
http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

// ============ 认证 API ============
export const authApi = {
  login: (username: string, password: string) =>
    http.post<AuthResponse, ApiResponse<AuthResponse>>('/auth/login', { username, password }),
  register: (username: string, password: string, email?: string) =>
    http.post<AuthResponse, ApiResponse<AuthResponse>>('/auth/register', { username, password, email }),
  logout: () => http.post('/auth/logout'),
  me: () => http.get<User, ApiResponse<User>>('/auth/me'),
  changePassword: (old_password: string, new_password: string) =>
    http.put('/auth/password', { old_password, new_password }),
}

// ============ 订阅源 API ============
export const feedApi = {
  list: (params?: { category_id?: string; status?: string }) =>
    http.get<Feed[], ApiResponse<Feed[]>>('/feeds', { params }),
  get: (id: string) =>
    http.get<Feed, ApiResponse<Feed>>(`/feeds/${id}`),
  create: (data: { feed_url: string; category_id?: string; title?: string }) =>
    http.post<Feed, ApiResponse<Feed>>('/feeds', data),
  update: (id: string, data: Partial<Feed>) =>
    http.put<Feed, ApiResponse<Feed>>(`/feeds/${id}`, data),
  delete: (id: string) =>
    http.delete(`/feeds/${id}`),
  refresh: (id: string) =>
    http.post(`/feeds/${id}/refresh`),
  discover: (url: string) =>
    http.post<DiscoveredFeed[], ApiResponse<DiscoveredFeed[]>>('/feeds/discover', { url }),
  importOPML: (opml: string) =>
    http.post('/feeds/import', opml, {
      headers: { 'Content-Type': 'text/xml' },
    }),
  exportOPML: () =>
    http.get('/feeds/export', { responseType: 'blob' }),
  recommendations: () =>
    http.get('/feeds/recommendations'),
}

// ============ 文章 API ============
export const articleApi = {
  list: (params: ArticleQuery) =>
    http.get<PaginatedResponse<Article>, ApiResponse<PaginatedResponse<Article>>>('/articles', { params }),
  get: (id: string) =>
    http.get<Article, ApiResponse<Article>>(`/articles/${id}`),
  markRead: (id: string) =>
    http.put(`/articles/${id}/read`),
  markUnread: (id: string) =>
    http.put(`/articles/${id}/unread`),
  toggleStar: (id: string) =>
    http.put(`/articles/${id}/star`),
  togglePin: (id: string) =>
    http.put(`/articles/${id}/pin`),
  saveProgress: (id: string, progress: number) =>
    http.put(`/articles/${id}/progress`, { progress }),
  batch: (data: BatchArticleOperation) =>
    http.post('/articles/batch', data),
  search: (q: string, page = 1) =>
    http.get('/articles/search', { params: { q, page } }),
}

// ============ 分类 API ============
export const categoryApi = {
  list: () =>
    http.get<Category[], ApiResponse<Category[]>>('/categories'),
  create: (data: { name: string; parent_id?: string; icon?: string; color?: string }) =>
    http.post<Category, ApiResponse<Category>>('/categories', data),
  update: (id: string, data: Partial<Category>) =>
    http.put<Category, ApiResponse<Category>>(`/categories/${id}`, data),
  delete: (id: string) =>
    http.delete(`/categories/${id}`),
  reorder: (orders: { id: string; sort_order: number }[]) =>
    http.put('/categories/reorder', { orders }),
}

// ============ 标签 API ============
export const tagApi = {
  list: () =>
    http.get<Tag[], ApiResponse<Tag[]>>('/tags'),
  create: (name: string, color?: string) =>
    http.post<Tag, ApiResponse<Tag>>('/tags', { name, color }),
  delete: (id: string) =>
    http.delete(`/tags/${id}`),
  setArticleTags: (articleId: string, tag_ids: string[]) =>
    http.post(`/tags/articles/${articleId}`, { tag_ids }),
}

// ============ 统计 API ============
export const statsApi = {
  get: () => http.get('/stats'),
}
