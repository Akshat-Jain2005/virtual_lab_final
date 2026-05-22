// src/pages/ProfilePage.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Key, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/stores/useAuthStore'
import AppShell from '@/components/layout/AppShell'

export function ProfilePage() {
  const { user, updateProfile, isLoading } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')

  const handleSave = async () => {
    const res = await updateProfile({ displayName, email })
    if (res.success) toast.success('Profile updated')
    else toast.error('Update failed')
  }

  return (
    <AppShell>
      <div className="p-8 max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold text-white mb-8">
            My <span className="text-glow-cyan">Profile</span>
          </h1>

          <div className="card-dark space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-border/50">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-void"
                style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff)' }}>
                {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-100">{user?.displayName || user?.username}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>

            {[
              { label: 'Display Name', icon: User, value: displayName, onChange: setDisplayName },
              { label: 'Email',        icon: Mail, value: email,       onChange: setEmail },
            ].map(f => (
              <div key={f.label} className="space-y-1.5">
                <label className="text-xs text-slate-400 uppercase tracking-widest">{f.label}</label>
                <div className="relative">
                  <f.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input className="input-dark pl-10" value={f.value} onChange={e => f.onChange(e.target.value)} />
                </div>
              </div>
            ))}

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 uppercase tracking-widest">New Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="password" placeholder="Leave blank to keep current"
                  className="input-dark pl-10" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>

            <button onClick={handleSave} disabled={isLoading} className="btn-primary w-full justify-center">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </motion.div>
      </div>
    </AppShell>
  )
}

// ─── Admin Metrics ──────────────────────────────────────────
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Activity, Server, Cpu, Database } from 'lucide-react'

const ADMIN_METRICS = Array.from({ length: 30 }, (_, i) => ({
  t: i,
  cpu:     20 + Math.sin(i * 0.5) * 15 + Math.random() * 5,
  memory:  45 + Math.sin(i * 0.3) * 10 + Math.random() * 3,
  sockets: Math.floor(8 + Math.sin(i * 0.4) * 4),
}))

export function AdminMetricsPage() {
  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        <h1 className="font-display text-2xl font-bold text-white">
          System <span className="text-glow-violet">Metrics</span>
        </h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'CPU Usage',    value: '34%',  icon: Cpu,      color: '#00f5ff' },
            { label: 'Memory',       value: '47%',  icon: Database, color: '#bf00ff' },
            { label: 'Active Rooms', value: '4',    icon: Server,   color: '#39ff14' },
            { label: 'WebSockets',   value: '11',   icon: Activity, color: '#fbbf24' },
          ].map((s, i) => (
            <motion.div key={s.label} className="card-dark"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                <span className="font-display text-xl font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
              <p className="text-xs text-slate-500">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="card-dark">
          <h3 className="font-display text-xs text-slate-400 uppercase tracking-widest mb-4">CPU & Memory (30s window)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={ADMIN_METRICS}>
              <defs>
                <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00f5ff" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gmem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#bf00ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#bf00ff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,48,72,0.6)" />
              <XAxis dataKey="t" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#64748b' }} />
              <Tooltip />
              <Area type="monotone" dataKey="cpu"    stroke="#00f5ff" fill="url(#gcpu)" strokeWidth={1.5} dot={false} name="CPU %" />
              <Area type="monotone" dataKey="memory" stroke="#bf00ff" fill="url(#gmem)" strokeWidth={1.5} dot={false} name="Mem %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppShell>
  )
}

// ─── Library Detail ─────────────────────────────────────────
import { useParams, useNavigate as useNav } from 'react-router-dom'
import { GitFork, Star, ArrowLeft, Play } from 'lucide-react'
import { MOCK_PROJECTS, projectsAPI as pApi } from '@/services/api'

export function LibraryDetailPage() {
  const { projectId } = useParams()
  const navigate = useNav()
  const project = MOCK_PROJECTS.find(p => p.id === projectId) || MOCK_PROJECTS[0]

  return (
    <AppShell>
      <div className="p-8 max-w-3xl mx-auto">
        <button onClick={() => navigate('/library')} className="btn-ghost text-xs mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Library
        </button>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-4 mb-6">
            <span className="text-5xl">{project?.thumbnail}</span>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{project?.name}</h1>
              <p className="text-slate-500 text-sm mt-1">by {project?.owner?.username}</p>
            </div>
          </div>

          <div className="card-dark mb-5">
            <p className="text-slate-300 leading-relaxed">{project?.description}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {project?.tags?.map(t => <span key={t} className="badge badge-violet">{t}</span>)}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate(`/room/room-alpha-01?load=${project?.id}`)} className="btn-primary">
              <Play className="w-4 h-4" /> Open in Canvas
            </button>
            <button onClick={async () => { await pApi.fork(project?.id); toast.success('Forked!') }} className="btn-ghost">
              <GitFork className="w-4 h-4" /> Fork ({project?.forksCount})
            </button>
          </div>
        </motion.div>
      </div>
    </AppShell>
  )
}

// ─── 404 Not Found ──────────────────────────────────────────
export function NotFoundPage() {
  const navigate = useNav()
  return (
    <div className="min-h-screen bg-void flex items-center justify-center bg-grid-sm">
      <motion.div className="text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <p className="font-display text-8xl font-bold text-glow-cyan mb-4">404</p>
        <p className="text-slate-400 mb-6">This dimension doesn't exist.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Back to Dashboard
        </button>
      </motion.div>
    </div>
  )
}
