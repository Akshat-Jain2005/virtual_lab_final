import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/stores/useAuthStore'



export function PrivateRoute({ children }) {
  const { isAuthed, token } = useAuthStore()
  const location = useLocation()

  
  const hasToken = isAuthed || !!token
  if (!hasToken) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return children
}



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



export function RoomRoute({ children }) {
  const { isAuthed, token } = useAuthStore()
  const location = useLocation()

  const hasToken = isAuthed || !!token
  if (!hasToken) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return children
}
