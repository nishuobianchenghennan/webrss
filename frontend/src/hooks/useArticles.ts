/**
 * 文章数据 Hook - 使用 TanStack Query
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { articleApi } from '@/lib/api'
import type { ArticleQuery } from '@rss-plus/shared'

export function useArticles(params: ArticleQuery) {
  return useQuery({
    queryKey: ['articles', params],
    queryFn: async () => {
      const res = await articleApi.list(params) as any
      return res.data
    },
  })
}

export function useArticle(id: string | null) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: async () => {
      const res = await articleApi.get(id!) as any
      return res.data
    },
    enabled: !!id,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: articleApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}

export function useMarkUnread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: articleApi.markUnread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}

export function useToggleStar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: articleApi.toggleStar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useBatchArticles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: articleApi.batch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}

export function useSearchArticles(query: string) {
  return useQuery({
    queryKey: ['articles', 'search', query],
    queryFn: async () => {
      const res = await articleApi.search(query) as any
      return res.data
    },
    enabled: query.length > 1,
  })
}
