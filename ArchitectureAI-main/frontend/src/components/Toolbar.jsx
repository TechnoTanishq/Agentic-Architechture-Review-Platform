import { useState } from 'react'
import { MousePointer2, Type, Square, Circle, Minus, Undo2, Redo2, Trash2, Sun, Moon, Cpu, Sparkles, ArrowLeft } from 'lucide-react'
import { useTheme } from '../App.jsx'

const tools = [
  { id: 'select',  icon: MousePointer2, label: 'Select  V' },
  { id: 'text',    icon: Type,          label: 'Text  T' },
  { id: 'rect',    icon: Square,        label: 'Rectangle  R' },
  { id: 'ellipse', icon: Circle,        label: 'Ellipse  E' },
  { id: 'line',    icon: Minus,         label: 'Line  L' },
]

export default function Toolbar({ tool, setTool, onUndo, onRedo, onDelete, canUndo, canRedo, hasSelected, isDark, onToggleTheme, onReview, onBack, elementCount }) {
  const t = useTheme()
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 2, height: 44, padding: '0 12px', background: t.surface, borderBottom: `1px solid ${t.border}`, flexShrink: 0, userSelect: 'none', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginRight: 6 }}>
        {onBack && <ToolBtn title="Back to home" onClick={onBack} t={t}><ArrowLeft size={15} /></ToolBtn>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 4px' }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #5b6af0, #9b6af0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={12} color="#fff" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: t.text, letterSpacing: '-0.2px' }}>ArchCanvas</span>
        </div>
      </div>
      <Divider t={t} />
      <div style={{ display: 'flex', gap: 1 }}>
        {tools.map(({ id, icon: Icon, label }) => (
          <ToolBtn key={id} active={tool === id} title={label} onClick={() => setTool(id)} t={t}><Icon size={15} /></ToolBtn>
        ))}
      </div>
      <Divider t={t} />
      <div style={{ display: 'flex', gap: 1 }}>
        <ToolBtn title="Undo  Ctrl+Z" onClick={onUndo} disabled={!canUndo} t={t}><Undo2 size={15} /></ToolBtn>
        <ToolBtn title="Redo  Ctrl+Y" onClick={onRedo} disabled={!canRedo} t={t}><Redo2 size={15} /></ToolBtn>
        <ToolBtn title="Delete" onClick={onDelete} disabled={!hasSelected} danger t={t}><Trash2 size={15} /></ToolBtn>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: t.textMuted, marginRight: 4 }}>{elementCount} {elementCount === 1 ? 'node' : 'nodes'}</span>
        <ToolBtn title={isDark ? 'Light mode' : 'Dark mode'} onClick={onToggleTheme} t={t}>{isDark ? <Sun size={15} /> : <Moon size={15} />}</ToolBtn>
        <Divider t={t} />
        <button onClick={onReview} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 30, borderRadius: 7, background: 'linear-gradient(135deg, #5b6af0, #7c6af0)', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '-0.1px', boxShadow: '0 1px 8px rgba(91,106,240,0.35)' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
          <Sparkles size={13} /> Review Architecture
        </button>
      </div>
    </header>
  )
}

function ToolBtn({ children, active, disabled, danger, onClick, title, t }) {
  const [hov, setHov] = useState(false)
  const col = disabled ? t.textFaint : danger && !disabled ? t.danger : active ? t.accent : hov ? t.text : t.textMuted
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', cursor: disabled ? 'default' : 'pointer', background: active ? t.accentBg : hov && !disabled ? t.surfaceHover : 'transparent', color: col, transition: 'background 0.1s, color 0.1s' }}>
      {children}
    </button>
  )
}

function Divider({ t }) {
  return <div style={{ width: 1, height: 18, background: t.border, margin: '0 6px' }} />
}
