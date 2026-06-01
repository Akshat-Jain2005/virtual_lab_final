import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, User, BarChart3, Settings,
  LogOut, Zap, Menu, X, Activity, ChevronRight, Archive
} from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/stores/useAuthStore'

const NAV_ITEMS = [
  { label: 'Dashboard',   icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Library',     icon: BookOpen,        path: '/library' },
  { label: 'Saved Rooms', icon: Archive,         path: '/rooms' },
  { label: 'Profile',     icon: User,            path: '/profile' },
]

const ADMIN_ITEMS = [
  { label: 'Metrics',   icon: Activity,        path: '/admin/metrics' },
]

function NavItem({ item, collapsed }) {
  return (
    <NavLink to={item.path}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
         ${isActive
           ? 'bg-cyan-neon/10 text-cyan-neon border border-cyan-neon/20 shadow-glow-sm'
           : 'text-slate-400 hover:text-slate-100 hover:bg-white/4'
         }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-neon' : ''}`} />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {!collapsed && isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
        </>
      )}
    </NavLink>
  )
}

export default function AppShell({ children }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/auth')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {}
      <div className={`flex items-center gap-3 px-4 py-5 mb-4 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #00f5ff, #0891b2)', boxShadow: '0 0 20px rgba(0,245,255,0.4)' }}>
          <Zap className="w-4 h-4 text-void" />
        </div>
        {!collapsed && (
          <span className="font-display text-sm font-bold text-glow-cyan tracking-widest">VIRTUAL-LAB</span>
        )}
      </div>

      {}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} />)}

        {user?.role === 'admin' && (
          <>
            <div className="my-3 border-t border-border/50" />
            <p className={`text-xs text-slate-600 uppercase tracking-widest px-3 mb-2 ${collapsed ? 'hidden' : ''}`}>Admin</p>
            {ADMIN_ITEMS.map(item => <NavItem key={item.path} item={item} collapsed={collapsed} />)}
          </>
        )}
      </nav>

      {}
      <div className="px-3 pb-4 space-y-2">
        <div className={`glass rounded-xl p-3 ${collapsed ? 'flex justify-center' : 'flex items-center gap-3'}`}>
          {!collapsed && (
            <>
              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold text-void"
                style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff)' }}>
                {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.displayName || user?.username}</p>
                <p className="text-xs text-slate-500 capitalize truncate">{user?.role}</p>
              </div>
            </>
          )}
          <button onClick={handleLogout} className="text-slate-500 hover:text-danger transition-colors ml-auto">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-void">
      {}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col flex-shrink-0 bg-surface border-r border-border/60 relative overflow-hidden"
      >
        {sidebarContent}
        {}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute top-5 -right-3 w-6 h-6 rounded-full glass border border-border flex items-center justify-center z-10 text-slate-400 hover:text-cyan-neon"
        >
          <ChevronRight className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </motion.aside>

      {}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-neon" />
          <span className="font-display text-sm text-glow-cyan">VIRTUAL-LAB</span>
        </div>
        <button onClick={() => setMobileOpen(o => !o)} className="text-slate-400">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {}
      {mobileOpen && (
        <motion.div
          className="lg:hidden fixed inset-0 z-40 bg-void/80 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => setMobileOpen(false)}
        >
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border/60 p-4"
            initial={{ x: -256 }} animate={{ x: 0 }}
            onClick={e => e.stopPropagation()}
          >
            {sidebarContent}
          </motion.div>
        </motion.div>
      )}

      {}
      <main className="flex-1 overflow-auto lg:pt-0 pt-14 bg-void">
        <div className="absolute inset-0 bg-hero-mesh pointer-events-none" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
