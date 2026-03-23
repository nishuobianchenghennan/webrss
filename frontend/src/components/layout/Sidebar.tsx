/**
 * 侧边栏组件 - Claude 风格设计
 */

import { useState } from 'react'
import {
  Inbox, Star, Pin, Rss, Plus, Settings, ChevronDown,
  RefreshCw, MoreHorizontal, Folder, Hash, FolderPlus, Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReadingStore } from '@/stores'
import { useFeeds } from '@/hooks/useFeeds'
import { useCategories, useDeleteCategory } from '@/hooks/useCategories'
import { useRefreshFeed, useDeleteFeed } from '@/hooks/useFeeds'
import AddFeedDialog from '@/components/feed/AddFeedDialog'
import AddCategoryDialog from '@/components/feed/AddCategoryDialog'

interface SidebarProps {
  onNavigateSettings?: () => void
}

export default function Sidebar({ onNavigateSettings }: SidebarProps) {
  const {
    selectedFeedId, selectedCategoryId, filterStatus,
    setSelectedFeed, setSelectedCategory, setFilterStatus,
  } = useReadingStore()
  const { data: feeds = [] } = useFeeds()
  const { data: categories = [] } = useCategories()
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(['__all__']))
  const [showAddFeed, setShowAddFeed] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const deleteCategory = useDeleteCategory()
  const refreshFeed = useRefreshFeed()
  const deleteFeed = useDeleteFeed()

  const totalUnread = feeds.reduce((sum: number, f: any) => sum + (f.unread_count || 0), 0)

  const toggleCat = (id: string) =>
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const feedsByCat = (catId: string | null) =>
    feeds.filter((f: any) => f.category_id === catId)

  const isSmartActive = (filter: string) =>
    filterStatus === filter && !selectedFeedId && !selectedCategoryId

  const smartGroups = [
    { id: 'all', label: '全部', icon: Inbox, count: totalUnread, filter: 'all' as const },
    { id: 'unread', label: '未读', icon: Hash, count: totalUnread, filter: 'unread' as const },
    { id: 'starred', label: '收藏', icon: Star, count: 0, filter: 'starred' as const },
    { id: 'pinned', label: '置顶', icon: Pin, count: 0, filter: 'pinned' as const },
  ]

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border-subtle)' }}
    >
      {/* 顶部 Logo + 添加按钮 */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent)' }}>
            <Rss size={14} className="text-white" />
          </div>
          <span className="font-semibold text-[13.5px]" style={{ color: 'var(--text-primary)' }}>
            RSS Plus
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowAddCategory(true)}
            className="btn-icon"
            title="新建分类"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={() => setShowAddFeed(true)}
            className="btn-icon"
            title="添加订阅源"
          >
            <Plus size={15} />
          </button>
        </div>
      </div>

      {/* 滚动内容区 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">

        {/* 智能分组 */}
        <div className="mb-1">
          {smartGroups.map(group => (
            <button
              key={group.id}
              onClick={() => {
                setFilterStatus(group.filter)
                setSelectedFeed(null)
                setSelectedCategory(null)
              }}
              className={cn('nav-item w-full text-left', isSmartActive(group.filter) && 'active')}
            >
              <group.icon size={14} className="flex-shrink-0" />
              <span className="flex-1 truncate">{group.label}</span>
              {group.count > 0 && <span className="unread-badge">{group.count > 99 ? '99+' : group.count}</span>}
            </button>
          ))}
        </div>

        {/* 分割线 */}
        {(feeds.length > 0 || categories.length > 0) && (
          <div className="divider" />
        )}

        {/* 未分类订阅源 */}
        {feedsByCat(null).length > 0 && (
          <div className="mb-1">
            {feedsByCat(null).map((feed: any) => (
              <FeedNavItem
                key={feed.id}
                feed={feed}
                selected={selectedFeedId === feed.id}
                onSelect={() => { setSelectedFeed(feed.id); setFilterStatus('all') }}
                onRefresh={() => refreshFeed.mutate(feed.id)}
                onDelete={() => deleteFeed.mutate(feed.id)}
              />
            ))}
          </div>
        )}

        {/* 分类树 */}
        {categories.map((cat: any) => (
          <div key={cat.id} className="mb-0.5">
            {/* 分类标题行 */}
            <div className="group flex items-center">
              <button
                onClick={() => { setSelectedCategory(cat.id); setFilterStatus('all') }}
                className={cn('nav-item flex-1 text-left', selectedCategoryId === cat.id && !selectedFeedId && 'active')}
              >
                <button
                  onClick={e => { e.stopPropagation(); toggleCat(cat.id) }}
                  className="p-0.5 -ml-1 rounded"
                >
                  <ChevronDown
                    size={13}
                    className="flex-shrink-0 transition-transform duration-150"
                    style={{ transform: expandedCats.has(cat.id) ? '' : 'rotate(-90deg)', color: 'var(--text-disabled)' }}
                  />
                </button>
                {cat.icon
                  ? <span className="text-base leading-none">{cat.icon}</span>
                  : <Folder size={14} className="flex-shrink-0" style={{ color: cat.color || 'var(--text-muted)' }} />
                }
                <span className="flex-1 truncate font-medium text-[12.5px]">{cat.name}</span>
                {cat.unread_count > 0 && (
                  <span className="unread-badge">{cat.unread_count > 99 ? '99+' : cat.unread_count}</span>
                )}
              </button>
              {/* 删除分类按钮（悬停显示） */}
              <button
                onClick={() => {
                  if (confirm(`确定删除分类「${cat.name}」吗？订阅源不会被删除。`)) {
                    deleteCategory.mutate(cat.id)
                  }
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded mr-1"
                style={{ color: 'var(--text-disabled)' }}
                title="删除分类"
              >
                <Trash2 size={11} />
              </button>
            </div>

            {/* 分类下的订阅源 */}
            {expandedCats.has(cat.id) && (
              <div className="ml-2 pl-2" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
                {feedsByCat(cat.id).map((feed: any) => (
                  <FeedNavItem
                    key={feed.id}
                    feed={feed}
                    selected={selectedFeedId === feed.id}
                    onSelect={() => { setSelectedFeed(feed.id); setFilterStatus('all') }}
                    onRefresh={() => refreshFeed.mutate(feed.id)}
                    onDelete={() => deleteFeed.mutate(feed.id)}
                  />
                ))}
                {feedsByCat(cat.id).length === 0 && (
                  <p className="text-[11px] px-2 py-1.5" style={{ color: 'var(--text-disabled)' }}>暂无订阅源</p>
                )}
              </div>
            )}
          </div>
        ))}

        {feeds.length === 0 && (
          <div className="text-center py-8 px-4">
            <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>
              还没有订阅源
            </p>
            <button
              onClick={() => setShowAddFeed(true)}
              className="mt-2 text-[12px] font-medium"
              style={{ color: 'var(--accent-text)' }}
            >
              添加第一个源
            </button>
          </div>
        )}
      </div>

      {/* 底部设置 */}
      <div className="px-2 pb-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
        <button onClick={onNavigateSettings} className="nav-item w-full text-left">
          <Settings size={14} className="flex-shrink-0" />
          <span>设置</span>
        </button>
      </div>

      {showAddFeed && <AddFeedDialog onClose={() => setShowAddFeed(false)} />}
      {showAddCategory && <AddCategoryDialog onClose={() => setShowAddCategory(false)} />}
    </div>
  )
}

// 订阅源导航项
function FeedNavItem({
  feed, selected, onSelect, onRefresh, onDelete
}: {
  feed: any; selected: boolean; onSelect: () => void; onRefresh: () => void; onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn('nav-item group relative', selected && 'active')}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Favicon 或默认图标 */}
      <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
        {feed.favicon_url ? (
          <img
            src={feed.favicon_url}
            alt=""
            className="w-4 h-4 rounded"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <Rss size={12} style={{ color: 'var(--text-disabled)' }} />
        )}
      </div>

      <span className="flex-1 truncate">{feed.title}</span>

      {/* 未读数 / 刷新 / 删除按钮 */}
      {hovered ? (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh() }}
            className="w-5 h-5 flex items-center justify-center rounded"
            title="刷新"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw size={11} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-5 h-5 flex items-center justify-center rounded"
            title="删除"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      ) : (
        feed.unread_count > 0 && (
          <span className="unread-badge">{feed.unread_count > 99 ? '99+' : feed.unread_count}</span>
        )
      )}

      {/* 错误状态指示 */}
      {feed.status === 'error' && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--danger)' }} />
      )}
    </div>
  )
}
