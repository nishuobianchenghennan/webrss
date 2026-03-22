/**
 * 数据管理设置页面
 */

import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { feedApi } from '@/lib/api'
import { downloadBlob, cn } from '@/lib/utils'
import { SettingsSection } from './SettingsSection'

export default function DataSettingsPage() {
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

  const handleImportOPML = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const res = await feedApi.importOPML(text) as any
      alert(res.message || '导入成功')
    } catch (error: any) {
      alert(error?.message || '导入失败')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  return (
    <SettingsSection title="数据管理" description="支持订阅列表的导入导出。">
      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between py-4 gap-4">
          <div>
            <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
              导入 OPML
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              从其他阅读器导入订阅列表
            </p>
          </div>
          <label className={cn('btn-secondary cursor-pointer flex items-center gap-1.5 text-[12.5px]', importing && 'opacity-50 pointer-events-none')}>
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

        <div className="flex items-center justify-between py-4 gap-4">
          <div>
            <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
              导出 OPML
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              导出订阅列表备份
            </p>
          </div>
          <button onClick={handleExportOPML} disabled={exporting} className="btn-secondary text-[12.5px]">
            <Download size={13} />
            {exporting ? '导出中...' : '导出文件'}
          </button>
        </div>
      </div>
    </SettingsSection>
  )
}
