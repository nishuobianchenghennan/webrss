/**
 * 订阅源数据 Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feedApi } from '@/lib/api'

export function useFeeds(params?: { category_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['feeds', params],
    queryFn: async () => {
      const res = await feedApi.list(params) as any
      return res.data as any[]
    },
  })
}

export function useFeed(id: string | null) {
  return useQuery({
    queryKey: ['feed', id],
    queryFn: async () => {
      const res = await feedApi.get(id!) as any
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: feedApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}

export function useUpdateFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      feedApi.update(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
    },
  })
}

export function useDeleteFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: feedApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useRefreshFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: feedApi.refresh,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })
}

export function useDiscoverFeed() {
  return useMutation({
    mutationFn: (url: string) => feedApi.discover(url),
  })
}
