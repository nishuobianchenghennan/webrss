/**
 * 应用路由入口
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import LoginPage from '@/views/LoginPage'
import ReaderPage from '@/views/ReaderPage'
import SettingsPage from '@/views/SettingsPage'

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
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
