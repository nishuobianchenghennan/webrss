/**
 * 阅读器主页面 - 三栏布局
 */

import { useNavigate } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import ArticleList from '@/components/layout/ArticleList'
import ArticleDetail from '@/components/layout/ArticleDetail'
import { useReadingStore } from '@/stores'
import { cn } from '@/lib/utils'

export default function ReaderPage() {
  const navigate = useNavigate()
  const { sidebarCollapsed, selectedArticleId } = useReadingStore()

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
    </div>
  )
}
