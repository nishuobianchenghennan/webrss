/**
 * 阅读器主页面 - 三栏布局
 */

import { useNavigate } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import ArticleList from '@/components/layout/ArticleList'
import ArticleDetail from '@/components/layout/ArticleDetail'
import AiAssistant from '@/components/ai/AiAssistant'
import { useReadingStore } from '@/stores'
import { useArticle } from '@/hooks/useArticles'
import { useArticles } from '@/hooks/useArticles'
import { cn } from '@/lib/utils'

export default function ReaderPage() {
  const navigate = useNavigate()
  const { sidebarCollapsed, selectedArticleId, selectedFeedId, selectedCategoryId, filterStatus } = useReadingStore()

  // 当前选中文章（供 AI 助手使用）
  const { data: articleData } = useArticle(selectedArticleId)
  const currentArticle = ((articleData as any)?.data || articleData) as any

  // 当前列表文章（供 AI 多选使用）
  const { data: listData } = useArticles({
    feed_id: selectedFeedId || undefined,
    category_id: selectedCategoryId || undefined,
    status: filterStatus,
    limit: 20,
  })
  const allArticles: any[] = (listData as any)?.records || []

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--surface-0)' }}>

      {/* 第一栏：侧边栏 */}
      <div
        className={cn(
          'flex-shrink-0 transition-all duration-200 overflow-hidden',
          sidebarCollapsed ? 'w-0' : 'w-56'
        )}
        style={{ borderRight: '1px solid var(--border-subtle)' }}
      >
        <Sidebar onNavigateSettings={() => navigate('/settings')} />
      </div>

      {/* 第二栏：文章列表 */}
      <div
        className={cn(
          'flex-shrink-0 transition-all duration-200 overflow-hidden',
          selectedArticleId ? 'hidden md:block md:w-72' : 'flex-1 md:w-72'
        )}
        style={{ borderRight: '1px solid var(--border-subtle)' }}
      >
        <div className="w-full h-full">
          <ArticleList />
        </div>
      </div>

      {/* 第三栏：文章详情 */}
      <div className={cn(
        'flex-1 min-w-0 h-full flex flex-col',
        !selectedArticleId && 'hidden md:flex'
      )}>
        <ArticleDetail />
      </div>

      {/* AI 助手浮动面板 */}
      <AiAssistant
        currentArticle={currentArticle ? {
          id: currentArticle.id,
          title: currentArticle.title,
          content: currentArticle.content,
          summary: currentArticle.summary,
        } : null}
        allArticles={allArticles.map((a: any) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          summary: a.summary,
        }))}
      />
    </div>
  )
}
