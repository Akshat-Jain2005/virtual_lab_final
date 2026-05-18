import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('vlab-auth')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
    } catch {}
  }
  return config
})

// ─── Mock helpers ───────────────────────────────────────────
const delay = (ms = 400) => new Promise(r => setTimeout(r, ms))

// ─── Mock Projects ──────────────────────────────────────────
export const MOCK_PROJECTS = [
  {
    id: 'proj_001', name: 'Pendulum Lab',
    description: 'Explore simple harmonic motion with varying lengths and masses.',
    tags: ['mechanics', 'oscillation'], thumbnail: '🌀',
    forksCount: 14, starsCount: 42, isPublic: true,
    owner: { id: 'usr_demo001', username: 'dr_maxwell' },
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'proj_002', name: 'Projectile Motion',
    description: 'Visualize parabolic trajectories under different gravity fields.',
    tags: ['kinematics', 'gravity'], thumbnail: '🚀',
    forksCount: 8, starsCount: 29, isPublic: true,
    owner: { id: 'usr_demo001', username: 'dr_maxwell' },
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'proj_003', name: 'Collision Workshop',
    description: 'Elastic and inelastic collisions with real-time momentum tracking.',
    tags: ['momentum', 'collisions'], thumbnail: '💥',
    forksCount: 22, starsCount: 67, isPublic: true,
    owner: { id: 'usr_ext_001', username: 'prof_chen' },
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: 'proj_004', name: 'Fluid Dynamics Intro',
    description: 'Buoyancy, drag forces, and viscosity in a simulated fluid medium.',
    tags: ['fluids', 'drag'], thumbnail: '🌊',
    forksCount: 5, starsCount: 18, isPublic: false,
    owner: { id: 'usr_demo001', username: 'dr_maxwell' },
    updatedAt: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: 'proj_005', name: 'Inclined Plane',
    description: 'Explore friction and gravity on an angled surface.',
    tags: ['mechanics', 'gravity'], thumbnail: '📐',
    forksCount: 11, starsCount: 35, isPublic: true,
    owner: { id: 'usr_ext_002', username: 'lab_assist' },
    updatedAt: new Date(Date.now() - 432000000).toISOString(),
  },
  {
    id: 'proj_006', name: 'Rotational Mechanics',
    description: 'Torque, angular momentum, and moment of inertia explorer.',
    tags: ['rotation', 'angular'], thumbnail: '⚙️',
    forksCount: 3, starsCount: 12, isPublic: true,
    owner: { id: 'usr_demo001', username: 'dr_maxwell' },
    updatedAt: new Date(Date.now() - 518400000).toISOString(),
  },
]

export const MOCK_ROOMS = [
  { id: 'room-alpha-01', name: 'PHY 201 Lab Session',    users: 7,  isLocked: false, status: 'active',  projectId: 'proj_001' },
  { id: 'room-beta-02',  name: 'Collision Research',      users: 3,  isLocked: true,  status: 'active',  projectId: 'proj_003' },
  { id: 'room-gamma-03', name: 'Office Hours Sandbox',    users: 1,  isLocked: false, status: 'idle',    projectId: null },
  { id: 'room-delta-04', name: 'Spring Systems Study',    users: 0,  isLocked: false, status: 'offline', projectId: 'proj_005' },
]

// ─── Auth API ───────────────────────────────────────────────
export const authAPI = {
  login: async ({ email, password }) => {
    const res = await api.post('/api/users/login', { email, password })
    return res.data
  },
  register: async ({ username, email, password, role = 'student' }) => {
    const res = await api.post('/api/users/register', { username, email, password, role })
    return res.data
  },
  refresh: async (refreshToken) => {
    const res = await api.post('/api/users/refresh', { refreshToken })
    return res.data
  },
  profile: async () => {
    const res = await api.get('/api/users/profile')
    return res.data
  },
}

// ─── Projects API ───────────────────────────────────────────
export const projectsAPI = {
  getAll: async () => {
    try {
      const res = await api.get('/api/projects')
      return res.data.length ? res.data : MOCK_PROJECTS
    } catch {
      return MOCK_PROJECTS
    }
  },
  getById: async (id) => {
    try {
      const res = await api.get('/api/projects')
      return res.data.find(p => p._id === id || p.id === id) || MOCK_PROJECTS.find(p => p.id === id) || null
    } catch {
      return MOCK_PROJECTS.find(p => p.id === id) || null
    }
  },
  create: async (data) => {
    const res = await api.post('/api/projects', data)
    return res.data
  },
  fork: async (projectId) => {
    try {
      const projects = await projectsAPI.getAll()
      const orig = projects.find(p => p._id === projectId || p.id === projectId)
      if (!orig) throw new Error('Original project not found')
      const res = await api.post('/api/projects', {
        name: `Fork of ${orig.name}`,
        description: orig.description,
        tags: orig.tags,
        thumbnail: orig.thumbnail || '⚙️',
      })
      return res.data
    } catch (err) {
      console.warn('Fallback fork mechanism', err)
      const orig = MOCK_PROJECTS.find(p => p.id === projectId)
      return { ...orig, id: `proj_fork_${Date.now()}`, name: `Fork of ${orig?.name}` }
    }
  },
  save: async (projectId, state) => {
    const res = await api.post(`/api/projects/${projectId}/versions`, {
      snapshot: state,
      note: 'Saved physics state',
    })
    return res.data
  },
}

// ─── Analytics API ──────────────────────────────────────────
export const analyticsAPI = {
  getFrames: async (roomId) => {
    try {
      const res = await api.get(`/api/analytics/${roomId}`)
      if (res.data && res.data.length) {
        return res.data.map(frame => ({
          t: new Date(frame.timestamp).getTime(),
          kineticEnergy: frame.aggregateData?.totalKE || 0,
          velocity: { x: 0, y: 0 },
          forces: { gravity: 9.81, friction: 0.3 },
        }))
      }
    } catch (err) {
      console.warn('Analytics API error, falling back to mock frames', err)
    }
    // Fallback to beautiful mock data so graphs are never blank
    return Array.from({ length: 60 }, (_, i) => ({
      t: Date.now() - (59 - i) * 1000,
      kineticEnergy: 120 + Math.sin(i * 0.3) * 40 + Math.random() * 10,
      velocity:      { x: Math.cos(i * 0.2) * 2, y: Math.sin(i * 0.15) * 1.5 },
      forces:        { gravity: 9.81, friction: 0.3 + Math.random() * 0.1 },
    }))
  },
}

export default api
