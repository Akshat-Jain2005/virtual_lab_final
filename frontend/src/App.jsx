import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect } from 'react'

import { PrivateRoute, AdminRoute, RoomRoute } from '@/components/layout/RouteGuards'
import useAuthStore from '@/stores/useAuthStore'

import AuthPage       from '@/pages/AuthPage'
import DashboardPage  from '@/pages/DashboardPage'
import SavedRoomsPage from '@/pages/SavedRoomsPage'
import RoomPage       from '@/pages/RoomPage'
import AnalyticsPage  from '@/pages/AnalyticsPage'
import LibraryPage    from '@/pages/LibraryPage'
import {
  ProfilePage,
  AdminMetricsPage,
  LibraryDetailPage,
  NotFoundPage,
} from '@/pages/OtherPages'

export default function App() {
  const { hydrateAuth } = useAuthStore()

  // Rehydrate auth from localStorage on mount
  useEffect(() => { hydrateAuth() }, [])

  return (
    <BrowserRouter>
      {/* Sonner toast portal */}
      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        closeButton
        toastOptions={{
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: 13 },
        }}
      />

      <Routes>
        {/* ── Public ── */}
        <Route path="/auth" element={<AuthPage />} />

        {/* ── Root redirect ── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ── Private ── */}
        <Route path="/dashboard" element={
          <PrivateRoute><DashboardPage /></PrivateRoute>
        } />

        <Route path="/rooms" element={
          <PrivateRoute><SavedRoomsPage /></PrivateRoute>
        } />

        <Route path="/profile" element={
          <PrivateRoute><ProfilePage /></PrivateRoute>
        } />

        <Route path="/library" element={
          <PrivateRoute><LibraryPage /></PrivateRoute>
        } />

        <Route path="/library/:projectId" element={
          <PrivateRoute><LibraryDetailPage /></PrivateRoute>
        } />

        {/* ── Room routes ── */}
        <Route path="/room/:id" element={
          <RoomRoute><RoomPage /></RoomRoute>
        } />

        <Route path="/room/:id/analytics" element={
          <RoomRoute><AnalyticsPage /></RoomRoute>
        } />

        {/* ── Admin ── */}
        <Route path="/admin/metrics" element={
          <AdminRoute><AdminMetricsPage /></AdminRoute>
        } />

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
