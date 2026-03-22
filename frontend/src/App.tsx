/**
 * 应用路由入口
 */

import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import LoginPage from '@/views/LoginPage'
import ReaderPage from '@/views/ReaderPage'
import SettingsPage from '@/views/SettingsPage'
import GeneralSettingsPage from '@/views/settings/GeneralSettingsPage'
import AiSettingsPage from '@/views/settings/AiSettingsPage'
import ShortcutSettingsPage from '@/views/settings/ShortcutSettingsPage'
import DataSettingsPage from '@/views/settings/DataSettingsPage'
import ThemeSettingsPage from '@/views/settings/ThemeSettingsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <ReaderPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="general" replace />} />
        <Route path="general" element={<GeneralSettingsPage />} />
        <Route path="ai" element={<AiSettingsPage />} />
        <Route path="shortcuts" element={<ShortcutSettingsPage />} />
        <Route path="data" element={<DataSettingsPage />} />
        <Route path="theme" element={<ThemeSettingsPage />} />
        <Route path="*" element={<Navigate to="general" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
