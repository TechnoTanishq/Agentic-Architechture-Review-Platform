import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal, Plus, Upload, PenTool, Trash2, Loader2, AlertCircle, CheckCircle, Clock, XCircle, LogOut, ChevronRight, Image, Pencil } from 'lucide-react'
import { projectsApi } from '../api.js'

const STATUS_META = {
  UPLOADING:  { color: '#4A5578', icon: Clock,        label: 'Uploading' },
  REVIEWING:  { color: '#4F6EF7', icon: Loader2,      label: 'Reviewing…' },
  COMPLETED:  { color: '#22C55E', icon: CheckCircle,  label: 'Completed' },
  FAILED:     { color: '#EF4444', icon: XCircle,      label: 'Failed' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [creating, setCreating]   = useState(false)
  const [showNew, setShowNew]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newDesc, setNewDesc]     = useState('')
  const [createdProject, setCreatedProject] = useState(null) // holds project after creation, waiting for choice

  const load = async () => {
    try {
      const data = await projectsApi.getAll()
      setProjects(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Auto-poll projects that are in REVIEWING state
  useEffect(() => {
    const reviewing = projects.some(p => p.status === 'REVIEWING')
    if (!reviewing) return
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [projects])

  const createProject = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const p = await projectsApi.create({ projectName: newName.trim(), description: newDesc.trim() })
      setProjects(prev => [p, ...prev])
      setNewName('')
      setNewDesc('')
      setCreatedProject(p) // show choice panel
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const dismissNew = () => {
    setShowNew(false)
    setCreatedProject(null)
    setNewName('')
    setNewDesc('')
  }

  const deleteProject = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this project? This cannot be undone.')) return
    try {
      await projectsApi.delete(id)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const logout = () => {
    localStorage.removeItem('jwt')
    navigate('/auth')
  }

  const openProject = (p) => {
    if (p.status === 'COMPLETED') navigate(`/report/${p.id}`)
    else if (p.status === 'UPLOADING' || !p.diagramUrl) navigate(`/upload/${p.id}`)
    else if (p.status === 'REVIEWING') navigate(`/report/${p.id}`)
    else navigate(`/upload/${p.id}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070B14', color: '#E8EBF4', fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav style={{ height: 54, borderBottom: '1px solid #1B2540', display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between', background: 'rgba(7,11,20,0.9)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #4F6EF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal size={13} color="#4F6EF7" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#E8EBF4', fontFamily: "'JetBrains Mono', monospace" }}>ArchitectureAI</span>
        </div>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 7, background: 'transparent', border: '1px solid #1B2540', color: '#4A5578', fontSize: 12, cursor: 'pointer' }}>
          <LogOut size={13} /> Sign out
        </button>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px' }}>Projects</h1>
            <p style={{ fontSize: 13, color: '#4A5578', margin: 0 }}>Upload an architecture diagram and get an AI-powered review in seconds.</p>
          </div>
          <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 9, background: '#4F6EF7', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> New project
          </button>
        </div>

        {error && (
          <div style={{ display: 'flex', gap: 9, padding: '12px 16px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 24 }}>
            <AlertCircle size={15} color="#EF4444" />
            <span style={{ fontSize: 13, color: '#EF4444' }}>{error}</span>
          </div>
        )}

        {/* New project form */}
        {showNew && (
          <div style={{ marginBottom: 28, padding: '22px 24px', borderRadius: 12, background: '#0D1220', border: '1px solid #1B2540' }}>
            {!createdProject ? (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: '#E8EBF4' }}>New project</h3>
                <form onSubmit={createProject} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name *" required
                    style={inputStyle} onFocus={e => e.target.style.borderColor = '#4F6EF7'} onBlur={e => e.target.style.borderColor = '#1B2540'} />
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" rows={2}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} onFocus={e => e.target.style.borderColor = '#4F6EF7'} onBlur={e => e.target.style.borderColor = '#1B2540'} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" disabled={creating} style={{ padding: '9px 20px', borderRadius: 8, background: '#4F6EF7', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                      {creating ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating…</> : 'Create project'}
                    </button>
                    <button type="button" onClick={dismissNew} style={{ padding: '9px 16px', borderRadius: 8, background: 'transparent', border: '1px solid #1B2540', color: '#4A5578', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <CheckCircle size={15} color="#22C55E" />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#E8EBF4', margin: 0 }}>"{createdProject.projectName}" created</h3>
                </div>
                <p style={{ fontSize: 13, color: '#4A5578', marginBottom: 20 }}>How do you want to add your architecture?</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <button onClick={() => { dismissNew(); navigate(`/upload/${createdProject.id}`) }}
                    style={{ padding: '18px 16px', borderRadius: 10, background: '#070B14', border: '1px solid #1B2540', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#4F6EF7'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1B2540'}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: '#4F6EF715', border: '1px solid #4F6EF730', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Image size={17} color="#4F6EF7" />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#E8EBF4', margin: '0 0 4px' }}>Upload diagram</p>
                    <p style={{ fontSize: 11, color: '#4A5578', margin: 0, lineHeight: 1.5 }}>Upload a JPG or PNG — Gemini will parse it automatically</p>
                  </button>
                  <button onClick={() => { dismissNew(); navigate(`/canvas/${createdProject.id}`) }}
                    style={{ padding: '18px 16px', borderRadius: 10, background: '#070B14', border: '1px solid #1B2540', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#7c6af0'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1B2540'}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: '#7c6af015', border: '1px solid #7c6af030', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      <Pencil size={17} color="#7c6af0" />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#E8EBF4', margin: '0 0 4px' }}>Draw on canvas</p>
                    <p style={{ fontSize: 11, color: '#4A5578', margin: 0, lineHeight: 1.5 }}>Use the interactive canvas to build your architecture from scratch</p>
                  </button>
                </div>
                <button onClick={dismissNew} style={{ marginTop: 14, padding: '7px 14px', borderRadius: 8, background: 'transparent', border: '1px solid #1B2540', color: '#4A5578', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              </>
            )}
          </div>
        )}

        {/* Project list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={24} color="#4F6EF7" style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ fontSize: 15, color: '#4A5578', marginBottom: 16 }}>No projects yet. Create one to get started.</p>
            <button onClick={() => setShowNew(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 9, background: '#4F6EF7', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> New project
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {projects.map(p => <ProjectCard key={p.id} project={p} onClick={() => openProject(p)} onDelete={(e) => deleteProject(p.id, e)} />)}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ProjectCard({ project: p, onClick, onDelete }) {
  const meta = STATUS_META[p.status] || STATUS_META.UPLOADING
  const Icon = meta.icon
  const isReviewing = p.status === 'REVIEWING'

  return (
    <div onClick={onClick} style={{ padding: '18px 20px', borderRadius: 11, background: '#0D1220', border: '1px solid #1B2540', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#2E3F6B'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1B2540'}>

      {/* Diagram thumbnail or placeholder */}
      <div style={{ width: 64, height: 48, borderRadius: 8, background: '#070B14', border: '1px solid #1B2540', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {p.diagramUrl
          ? <img src={p.diagramUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Upload size={18} color="#1B2540" />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#E8EBF4', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.projectName}</p>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: meta.color, background: `${meta.color}14`, padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>
            <Icon size={9} style={isReviewing ? { animation: 'spin 0.8s linear infinite' } : {}} />
            {meta.label}
          </span>
        </div>
        {p.description && <p style={{ fontSize: 12, color: '#4A5578', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>}
        <p style={{ fontSize: 11, color: '#2E3F6B', margin: '3px 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
          {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {!p.diagramUrl && (
          <span style={{ fontSize: 11, color: '#4F6EF7', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Upload size={11} /> Upload diagram
          </span>
        )}
        {p.status === 'COMPLETED' && (
          <span style={{ fontSize: 11, color: '#22C55E', display: 'flex', alignItems: 'center', gap: 4 }}>
            View report <ChevronRight size={11} />
          </span>
        )}
        <button onClick={onDelete} title="Delete project"
          style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: '1px solid #1B2540', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A5578' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#EF4444'; e.currentTarget.style.color = '#EF4444' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1B2540'; e.currentTarget.style.color = '#4A5578' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#070B14',
  border: '1px solid #1B2540',
  borderRadius: 8,
  color: '#E8EBF4',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'Inter, sans-serif',
  transition: 'border-color 0.15s',
}
