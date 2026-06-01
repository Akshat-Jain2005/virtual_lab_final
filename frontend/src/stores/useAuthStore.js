import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI } from '@/services/api'


const MOCK_USER = {
  id: 'usr_demo001',
  username: 'dr_maxwell',
  email: 'maxwell@virtuallab.io',
  displayName: 'Dr. A. Maxwell',
  role: 'instructor',          
  avatar: null,
  createdAt: '2024-09-01T00:00:00Z',
}

const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo_token_for_hackathon'


const useAuthStore = create(
  persist(
    (set, get) => ({
      
      user:     null,
      token:    null,
      isAuthed: false,
      isLoading: false,
      error:    null,

      
      login: async ({ email, password }) => {
        set({ isLoading: true, error: null })
        try {
          const res = await authAPI.login({ email, password })
          set({ user: res.user, token: res.accessToken, isAuthed: true, isLoading: false })
          return { success: true }
        } catch (err) {
          
          if (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || !err.response) {
            console.warn('Backend is offline. Logging in with demo fallback credentials.')
            set({ user: MOCK_USER, token: MOCK_TOKEN, isAuthed: true, isLoading: false })
            return { success: true, isMock: true }
          }
          const errMsg = err.response?.data?.error || err.message || 'Invalid credentials'
          set({ error: errMsg, isLoading: false })
          return { success: false, error: errMsg }
        }
      },

      register: async ({ username, email, password }) => {
        set({ isLoading: true, error: null })
        try {
          await authAPI.register({ username, email, password, role: 'student' })
          const res = await authAPI.login({ email, password })
          set({ user: res.user, token: res.accessToken, isAuthed: true, isLoading: false })
          return { success: true }
        } catch (err) {
          
          if (err.message === 'Network Error' || err.code === 'ERR_NETWORK' || !err.response) {
            console.warn('Backend is offline. Registering and logging in with demo fallback.')
            const mockRegisteredUser = {
              ...MOCK_USER,
              username: username || MOCK_USER.username,
              email: email || MOCK_USER.email,
              displayName: username || MOCK_USER.displayName
            }
            set({ user: mockRegisteredUser, token: MOCK_TOKEN, isAuthed: true, isLoading: false })
            return { success: true, isMock: true }
          }
          const errMsg = err.response?.data?.error || err.message || 'Registration failed'
          set({ error: errMsg, isLoading: false })
          return { success: false, error: errMsg }
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthed: false, error: null })
      },

      updateProfile: async (updates) => {
        set({ isLoading: true })
        await new Promise(r => setTimeout(r, 600))
        set(state => ({ user: { ...state.user, ...updates }, isLoading: false }))
        return { success: true }
      },

      clearError: () => set({ error: null }),

      
      hydrateAuth: () => {
        const { token, user } = get()
        if (token && user) {
          set({ isAuthed: true })
        }
      },
    }),
    {
      name: 'vlab-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)

export default useAuthStore
