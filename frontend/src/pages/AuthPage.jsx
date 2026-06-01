import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AtSign, Lock, User, ArrowRight, Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/stores/useAuthStore'


function PhysicsOrbs() {
  const orbs = [
    { size: 60,  x: '20%', y: '30%', color: '#00f5ff', delay: 0,   dur: 7 },
    { size: 100, x: '55%', y: '55%', color: '#bf00ff', delay: 1.5, dur: 9 },
    { size: 40,  x: '75%', y: '25%', color: '#39ff14', delay: 0.5, dur: 6 },
    { size: 80,  x: '35%', y: '70%', color: '#00f5ff', delay: 2,   dur: 8 },
    { size: 55,  x: '80%', y: '70%', color: '#bf00ff', delay: 1,   dur: 7.5 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width:  o.size,
            height: o.size,
            left:   o.x,
            top:    o.y,
            background: `radial-gradient(circle at 35% 35%, ${o.color}40, ${o.color}08)`,
            border: `1px solid ${o.color}30`,
            boxShadow: `0 0 30px ${o.color}25, inset 0 0 20px ${o.color}10`,
          }}
          animate={{ y: [0, -20, 0], rotate: [0, 180, 360], scale: [1, 1.05, 1] }}
          transition={{ duration: o.dur, delay: o.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <motion.line x1="20%" y1="30%" x2="55%" y2="55%"
          stroke="#00f5ff" strokeWidth="0.5" strokeDasharray="4 6"
          animate={{ opacity: [0.2, 0.6, 0.2] }} transition={{ duration: 3, repeat: Infinity }} />
        <motion.line x1="55%" y1="55%" x2="75%" y2="25%"
          stroke="#bf00ff" strokeWidth="0.5" strokeDasharray="4 6"
          animate={{ opacity: [0.4, 0.1, 0.4] }} transition={{ duration: 4, repeat: Infinity }} />
        <motion.line x1="35%" y1="70%" x2="80%" y2="70%"
          stroke="#39ff14" strokeWidth="0.5" strokeDasharray="4 6"
          animate={{ opacity: [0.1, 0.5, 0.1] }} transition={{ duration: 3.5, repeat: Infinity }} />
      </svg>
    </div>
  )
}


function Field({ icon: Icon, label, type = 'text', value, onChange, placeholder, autoFocus }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="input-dark pl-10"
        />
      </div>
    </div>
  )
}

export default function AuthPage() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { login, register, isLoading, isAuthed } = useAuthStore()

  const [mode,     setMode]     = useState('login') 
  const [email,    setEmail]    = useState('demo@virtuallab.io')
  const [password, setPassword] = useState('demo1234')
  const [username, setUsername] = useState('')

  // Redirect if already authed
  useEffect(() => {
    if (isAuthed) {
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthed])

  const handleSubmit = async () => {
    if (mode === 'login') {
      const res = await login({ email, password })
      if (res.success) {
        toast.success('Welcome back, Dr. Maxwell')
        navigate('/dashboard')
      } else {
        toast.error(res.error || 'Login failed')
      }
    } else {
      if (!username.trim()) { toast.error('Username required'); return }
      const res = await register({ username, email, password })
      if (res.success) {
        toast.success('Account created — welcome to Virtual Lab!')
        navigate('/dashboard')
      } else {
        toast.error(res.error || 'Registration failed')
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-void overflow-hidden">

      {}
      <div className="hidden lg:flex flex-1 relative flex-col justify-center items-center p-16 overflow-hidden">
        <div className="absolute inset-0 bg-grid-sm opacity-40" />
        <div className="absolute inset-0 bg-glow-cyan" style={{ background: 'radial-gradient(ellipse at 40% 40%, rgba(0,245,255,0.07) 0%, transparent 60%)' }} />
        <PhysicsOrbs />

        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00f5ff, #0891b2)', boxShadow: '0 0 30px rgba(0,245,255,0.5)' }}>
              <Zap className="w-6 h-6 text-void" />
            </div>
            <span className="font-display text-2xl font-bold text-glow-cyan tracking-widest">VIRTUAL-LAB</span>
          </div>

          <h2 className="text-4xl font-display font-bold text-white mb-4 leading-tight">
            Physics at the<br />
            <span className="text-glow-cyan">Speed of Thought</span>
          </h2>

          <p className="text-slate-400 text-base max-w-xs mx-auto leading-relaxed">
            Collaborative 2D physics sandbox for university-level experimentation and discovery.
          </p>

          <div className="mt-10 flex justify-center gap-6 text-xs text-slate-500 font-mono">
            {['60Hz Physics', 'Multi-user', 'Real-time'].map((t, i) => (
              <motion.div key={t} className="flex items-center gap-1.5"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.15 }}>
                <span className="status-dot online" />
                {t}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {}
      <div className="flex-1 lg:max-w-md flex items-center justify-center p-8 lg:p-12 relative">
        <div className="absolute inset-0 bg-surface/50" />

        <motion.div
          className="relative z-10 w-full max-w-sm"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          {}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <Zap className="w-5 h-5 text-cyan-neon" />
            <span className="font-display text-lg text-glow-cyan tracking-widest">VIRTUAL-LAB</span>
          </div>

          {}
          <div className="glass rounded-2xl p-1 flex mb-8">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 capitalize
                  ${mode === m ? 'btn-primary' : 'text-slate-400 hover:text-slate-200'}`}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {mode === 'register' && (
                <Field icon={User} label="Username" value={username} onChange={setUsername}
                  placeholder="your_username" autoFocus />
              )}
              <Field icon={AtSign} label="Email" type="email" value={email} onChange={setEmail}
                placeholder="you@university.edu" autoFocus={mode === 'login'} />
              <Field icon={Lock} label="Password" type="password" value={password} onChange={setPassword}
                placeholder="••••••••" />
            </motion.div>
          </AnimatePresence>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn-primary w-full mt-6 justify-center"
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><span>{mode === 'login' ? 'Enter Lab' : 'Create Account'}</span><ArrowRight className="w-4 h-4" /></>
            }
          </button>

          <p className="text-center text-xs text-slate-500 mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-cyan-neon hover:underline">
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>

          {}
          <div className="mt-6 glass rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500">
              <span className="badge badge-cyan mr-1">DEMO</span>
              Pre-filled credentials — just click <em>Enter Lab</em>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
