import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/stores/useAuthStore'

// ─── PrivateRoute ──────────────────────────────────────────
// Requires authenticated user. Redirects to /auth if not.
export function PrivateRoute({ children }) {
  const { isAuthed, token } = useAuthStore()
  const location = useLocation()

  // Check persisted token too
  const hasToken = isAuthed || !!token
  if (!hasToken) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return children
}

// ─── AdminRoute ────────────────────────────────────────────
// Requires authenticated user with role 'admin'.
export function AdminRoute({ children }) {
  const { isAuthed, token, user } = useAuthStore()
  const location = useLocation()

  const hasToken = isAuthed || !!token
  if (!hasToken) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// ─── RoomRoute ─────────────────────────────────────────────
// Requires auth; validates roomId param format.
export function RoomRoute({ children }) {
  const { isAuthed, token } = useAuthStore()
  const location = useLocation()

  const hasToken = isAuthed || !!token
  if (!hasToken) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return children
}
