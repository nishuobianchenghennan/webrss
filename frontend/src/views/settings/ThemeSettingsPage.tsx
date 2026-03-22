/**
 * 主题设置页面
 */

import { useMemo, useState } from 'react'
import {
  DEFAULT_THEME_PALETTES,
  getMergedPalette,
  type ResolvedThemeMode,
  THEME_TOKEN_GROUPS,
  usePreferenceStore,
} from '@/stores'
import { SettingsSection } from './SettingsSection'

export default function ThemeSettingsPage() {
  const { paletteOverrides, resetPalette } = usePreferenceStore()
  const setPaletteToken = usePreferenceStore((state) => state.setPaletteToken)
  const [editorMode, setEditorMode] = useState<ResolvedThemeMode>('light')

  const palette = useMemo(
    () => getMergedPalette(editorMode, paletteOverrides),
    [editorMode, paletteOverrides]
  )

  return (
    <div className="space-y-4">
      <SettingsSection title="主题调色板" description="分别配置浅色与深色模式下的完整配色。">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(['light', 'dark'] as ResolvedThemeMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setEditorMode(mode)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
              style={editorMode === mode
                ? { background: 'var(--accent-subtle)', color: 'var(--accent-text)' }
                : { background: 'var(--surface-2)', color: 'var(--text-muted)' }}
            >
              {mode === 'light' ? '浅色调色板' : '深色调色板'}
            </button>
          ))}

          <button onClick={() => resetPalette(editorMode)} className="btn-secondary text-[12px] ml-auto">
            重置当前调色板
          </button>
        </div>

        <div className="rounded-2xl p-4 mb-5" style={{ background: palette['surface-0'], border: `1px solid ${palette.border}` }}>
          <div className="rounded-xl p-4" style={{ background: palette['surface-1'], border: `1px solid ${palette['border-subtle']}` }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[14px] font-semibold" style={{ color: palette['text-primary'] }}>
                  主题实时预览
                </p>
                <p className="text-[12px]" style={{ color: palette['text-muted'] }}>
                  当前编辑：{editorMode === 'light' ? '浅色模式' : '深色模式'}
                </p>
              </div>
              <button
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium"
                style={{ background: palette.accent, color: '#ffffff' }}
              >
                主按钮
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg px-3 py-2" style={{ background: palette['surface-2'], color: palette['text-secondary'] }}>
                次级容器
              </div>
              <div className="rounded-lg px-3 py-2" style={{ background: palette['accent-subtle'], color: palette['accent-text'] }}>
                强调提示
              </div>
              <div className="rounded-lg px-3 py-2" style={{ background: palette['warning-subtle'], color: palette.warning }}>
                状态提示
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {THEME_TOKEN_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[13px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                {group.title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.tokens.map(({ key, label }) => (
                  <label
                    key={key}
                    className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                    style={{ background: 'var(--surface-0)', border: '1px solid var(--border-subtle)' }}
                  >
                    <input
                      type="color"
                      value={palette[key]}
                      onChange={(event) => setPaletteToken(editorMode, key, event.target.value)}
                      className="w-10 h-10 rounded-lg bg-transparent cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {label}
                      </p>
                      <p className="text-[11px] mt-0.5 uppercase" style={{ color: 'var(--text-disabled)' }}>
                        {key}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        默认值：{DEFAULT_THEME_PALETTES[editorMode][key]}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {palette[key]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  )
}
