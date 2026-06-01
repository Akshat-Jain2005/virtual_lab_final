
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, GitFork, Star, Globe, Lock, ExternalLink,
  Filter, Save, Upload, Share2, Clock, Wifi, WifiOff,
  FlaskConical, Trash2, ChevronDown, X,
} from 'lucide-react'
import { toast } from 'sonner'

import { MOCK_PROJECTS, projectsAPI } from '@/services/api'
import {
  saveExperiment, loadExperiment, listLocalExperiments, serializeWorld,
} from '@/services/experimentLibrary'
import AppShell from '@/components/layout/AppShell'

const TAGS = ['All', 'mechanics', 'oscillation', 'kinematics', 'momentum', 'fluids', 'elasticity', 'rotation']


function SaveModal({ engine, onClose, onSaved }) {
  const [name,     setName]     = useState('')
  const [tags,     setTags]     = useState([])
  const [isPublic, setIsPublic] = useState(false)
  const [saving,   setSaving]   = useState(false)

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Please enter a name'); return }
    setSaving(true)
    try {
      const result = await saveExperiment(engine, name.trim(), tags, isPublic)
      toast.success(
        result.offline
          ? `"${result.name}" saved locally`
          : `"${result.name}" saved to library`,
        { icon: '💾' }
      )
      onSaved(result)
      onClose()
    } catch (err) {
      toast.error(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleTag = (t) => setTags(prev =>
    prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="card-dark w-full max-w-md p-6 space-y-5"
        style={{ border: '1px solid rgba(0,245,255,0.2)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Save Experiment</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="text-xs text-slate-500 font-mono uppercase tracking-wider block mb-1.5">
            Name
          </label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="My Pendulum Experiment…"
            className="input-dark w-full"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs text-slate-500 font-mono uppercase tracking-wider block mb-1.5">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {TAGS.slice(1).map(t => (
              <button key={t} onClick={() => toggleTag(t)}
                className={`badge text-xs py-1 px-3 cursor-pointer transition-all ${
                  tags.includes(t) ? 'badge-cyan' : 'bg-surface text-slate-500 border border-border hover:border-slate-500'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <div
            onClick={() => setIsPublic(v => !v)}
            className={`w-10 h-5 rounded-full transition-colors relative ${isPublic ? 'bg-cyan-neon/40' : 'bg-surface border border-border'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${isPublic ? 'translate-x-5 bg-cyan-neon' : 'translate-x-0.5 bg-slate-500'}`} />
          </div>
          <span className="text-sm text-slate-300">Make public</span>
          {isPublic ? <Globe className="w-3.5 h-3.5 text-cyan-neon" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
        </label>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-cyan-neon/10 border border-cyan-neon/30 text-cyan-neon hover:bg-cyan-neon/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50">
            {saving ? 'Saving…' : <><Save className="w-4 h-4 inline mr-1.5" />Save</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}


function ProjectCard({ project, engine, onFork, onLoad, onDelete, forking, loading, i }) {
  const navigate = useNavigate()

  const handleShare = (e) => {
    e.stopPropagation()
    const url = `${window.location.origin}/library/${project.id}`
    navigator.clipboard?.writeText(url).then(() => {
      toast.success('Link copied to clipboard', { icon: '🔗' })
    }).catch(() => {
      toast(`Share URL: ${url}`)
    })
  }

  const handleLoad = (e) => {
    e.stopPropagation()
    onLoad(project)
  }

  return (
    <motion.div
      className="card-dark shine cursor-pointer group relative"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      onClick={() => navigate(`/library/${project.id}`)}
    >
      {project.isLocal && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <WifiOff className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] text-amber-400 font-mono">local</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{project.thumbnail || '🔬'}</span>
        <div className="flex items-center gap-1.5">
          {project.isPublic
            ? <Globe className="w-3.5 h-3.5 text-slate-500" />
            : <Lock  className="w-3.5 h-3.5 text-slate-500" />
          }
        </div>
      </div>

      <h3 className="font-semibold text-slate-100 mb-1.5">{project.name}</h3>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">
        {project.description || 'Physics experiment'}
      </p>

      <div className="flex flex-wrap gap-1 mb-4">
        {(project.tags || []).map(t => (
          <span key={t} className="badge badge-violet text-xs">{t}</span>
        ))}
      </div>

      {project.savedAt && (
        <div className="flex items-center gap-1 text-[10px] text-slate-600 font-mono mb-3">
          <Clock className="w-3 h-3" />
          {new Date(project.savedAt).toLocaleString()}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex gap-3">
          {project.starsCount != null && (
            <span className="flex items-center gap-1"><Star className="w-3 h-3" />{project.starsCount}</span>
          )}
          {project.forksCount != null && (
            <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{project.forksCount}</span>
          )}
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {}
          {engine && (
            <button onClick={handleLoad} disabled={loading === project.id}
              className="btn-ghost py-1 px-2 text-xs">
              {loading === project.id
                ? <span className="font-mono text-[10px]">Loading…</span>
                : <><Upload className="w-3 h-3 inline" /> Load</>}
            </button>
          )}
          {}
          {!project.isLocal && (
            <button onClick={e => { e.stopPropagation(); onFork(project) }}
              disabled={forking === project.id}
              className="btn-ghost py-1 px-2 text-xs">
              {forking === project.id ? '…' : <><GitFork className="w-3 h-3 inline" /> Fork</>}
            </button>
          )}
          {}
          <button onClick={handleShare} className="btn-ghost py-1 px-2 text-xs">
            <Share2 className="w-3 h-3" />
          </button>
          {}
          {project.isLocal && (
            <button onClick={e => { e.stopPropagation(); onDelete(project) }}
              className="btn-ghost py-1 px-2 text-xs text-red-400 hover:bg-red-400/10">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {}
          {!project.isLocal && (
            <button className="btn-ghost py-1 px-2 text-xs"
              onClick={e => { e.stopPropagation(); navigate('/room/room-alpha-01') }}>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}


export default function LibraryPage({ engine: engineProp }) {
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()

  const [search,    setSearch]    = useState('')
  const [activeTag, setActiveTag] = useState('All')
  const [forking,   setForking]   = useState(null)
  const [loading,   setLoading]   = useState(null)
  const [projects,  setProjects]  = useState([])
  const [showSave,  setShowSave]  = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  
  const engine = engineProp ?? null

  
  useEffect(() => {
    async function fetchProjects() {
      setIsFetching(true)
      try {
        const remote = await projectsAPI.getAll()
        const local  = listLocalExperiments()
        setProjects([...local, ...remote])
      } catch {
        setProjects([...listLocalExperiments(), ...MOCK_PROJECTS])
      } finally {
        setIsFetching(false)
      }
    }
    fetchProjects()
  }, [])

  
  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())
    const matchTag = activeTag === 'All' || (p.tags || []).includes(activeTag)
    return matchSearch && matchTag
  })

  
  const handleFork = useCallback(async (project) => {
    setForking(project.id)
    try {
      const forked = await projectsAPI.fork(project.id)
      setProjects(prev => [{ ...forked, isLocal: false }, ...prev])
      toast.success(`Forked "${project.name}"`, { icon: '🍴' })
    } catch {
      toast.error('Fork failed')
    } finally {
      setForking(null)
    }
  }, [])

  
  const handleLoad = useCallback(async (project) => {
    if (!engine) {
      toast('Open a room first, then load from the library', { icon: '💡' })
      return
    }
    setLoading(project.id)
    try {
      const { bodyCount } = await loadExperiment(engine, project.id)
      toast.success(`Loaded "${project.name}" — ${bodyCount} bodies`, { icon: '⚗️' })
    } catch (err) {
      toast.error(`Load failed: ${err.message}`)
    } finally {
      setLoading(null)
    }
  }, [engine])

  
  const handleDelete = useCallback((project) => {
    localStorage.removeItem(project.id)
    setProjects(prev => prev.filter(p => p.id !== project.id))
    toast('Local experiment deleted', { icon: '🗑' })
  }, [])

  
  const handleSaved = useCallback((result) => {
    const newProject = {
      id:       result.id,
      name:     result.name,
      tags:     result.tags ?? [],
      savedAt:  result.savedAt,
      isLocal:  result.offline ?? false,
      isPublic: false,
      thumbnail: '🔬',
    }
    setProjects(prev => [newProject, ...prev])
  }, [])

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-white">
            Experiment <span className="text-glow-cyan">Library</span>
          </h1>

          {engine && (
            <motion.button
              onClick={() => setShowSave(true)}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                bg-cyan-neon/10 border border-cyan-neon/30 text-cyan-neon
                hover:bg-cyan-neon/20 transition-all"
              style={{ boxShadow: '0 0 16px rgba(0,245,255,0.1)' }}
            >
              <Save className="w-4 h-4" />
              Save Current State
            </motion.button>
          )}
        </div>

        {}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search experiments…"
              className="input-dark pl-10 w-full" />
          </div>
          <button className="btn-ghost px-4">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {}
        <div className="flex flex-wrap gap-2">
          {TAGS.map(tag => (
            <button key={tag} onClick={() => setActiveTag(tag)}
              className={`badge text-xs py-1 px-3 cursor-pointer transition-all ${
                activeTag === tag ? 'badge-cyan' : 'bg-surface text-slate-500 border border-border hover:border-slate-500'
              }`}>
              {tag}
            </button>
          ))}
        </div>

        {}
        {isFetching && (
          <div className="text-center py-16">
            <FlaskConical className="w-10 h-10 text-slate-700 mx-auto mb-3 animate-pulse" />
            <p className="text-slate-600 font-mono text-sm">Loading experiments…</p>
          </div>
        )}

        {}
        {!isFetching && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                engine={engine}
                onFork={handleFork}
                onLoad={handleLoad}
                onDelete={handleDelete}
                forking={forking}
                loading={loading}
                i={i}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16">
                <FlaskConical className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-600 font-mono text-sm">No experiments found.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {}
      <AnimatePresence>
        {showSave && engine && (
          <SaveModal engine={engine} onClose={() => setShowSave(false)} onSaved={handleSaved} />
        )}
      </AnimatePresence>
    </AppShell>
  )
}
