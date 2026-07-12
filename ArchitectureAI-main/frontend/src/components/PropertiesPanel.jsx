import { useState } from 'react'
import { SlidersHorizontal, ChevronDown, ChevronUp, Copy, Check, MousePointer2 } from 'lucide-react'
import { parseToArchitecturalGraph } from '../utils/parser.js'
import { useTheme } from '../App.jsx'

const PRESETS = ['#5b6af0','#e05757','#34c77b','#f0a84a','#3b82f6','#ec4899','#06b6d4','#e8501a','#f0f0f0','#94a3b8']

export default function PropertiesPanel({ element, onUpdate, elements, showJSON, setShowJSON }) {
  const t = useTheme()
  const [copied, setCopied] = useState(false)
  const parsed = parseToArchitecturalGraph(elements)
  const jsonStr = JSON.stringify(parsed, null, 2)
  const copy = () => { navigator.clipboard.writeText(jsonStr); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <aside style={{ width: 236, flexShrink: 0, background: t.surface, borderLeft: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SlidersHorizontal size={13} color={t.textMuted} />
          <span style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Properties</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {!element ? (
          <div style={{ paddingTop: 40, textAlign: 'center' }}>
            <MousePointer2 size={24} color={t.textFaint} style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 12, color: t.textFaint, lineHeight: 1.6 }}>Select a component<br />to edit its properties</p>
          </div>
        ) : <Props element={element} onUpdate={onUpdate} t={t} />}
      </div>
      <div style={{ borderTop: `1px solid ${t.border}`, flexShrink: 0 }}>
        <button onClick={() => setShowJSON(!showJSON)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', color: t.accent, fontSize: 12, fontWeight: 600 }}>
          <span>Parsed JSON</span>
          {showJSON ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        {showJSON && (
          <div style={{ borderTop: `1px solid ${t.border}`, maxHeight: 300, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '5px 10px' }}>
              <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.surfaceHover, border: `1px solid ${t.border}`, borderRadius: 5, color: copied ? t.success : t.textMuted, fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}>
                {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre style={{ margin: 0, padding: '0 12px 12px', fontSize: 10, color: t.success, lineHeight: 1.6, fontFamily: '"SF Mono","Fira Code",monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{jsonStr}</pre>
          </div>
        )}
      </div>
    </aside>
  )
}

function Props({ element: el, onUpdate, t }) {
  const isText = el.kind === 'text'
  const isComponent = el.kind === 'component'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field label="Label" t={t}>
        <input value={isText ? (el.text || '') : (el.label || '')} onChange={e => onUpdate(isText ? { text: e.target.value } : { label: e.target.value })} style={inp(t)} />
      </Field>
      {isComponent && <Field label="Description" t={t}><textarea value={el.description || ''} rows={2} onChange={e => onUpdate({ description: e.target.value })} style={{ ...inp(t), resize: 'none', height: 52 }} /></Field>}
      <Field label="Font" t={t}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="number" min={8} max={72} value={el.fontSize || 12} onChange={e => onUpdate({ fontSize: +e.target.value })} style={{ ...inp(t), width: 52, textAlign: 'center' }} />
          <div style={{ display: 'flex', gap: 3 }}>
            {[['N','normal'],['B','bold'],['I','italic']].map(([lbl, val]) => (
              <button key={val} onClick={() => onUpdate({ fontStyle: val })} style={{ width: 26, height: 26, borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: lbl === 'B' ? 700 : 400, fontStyle: lbl === 'I' ? 'italic' : 'normal', background: el.fontStyle === val ? t.accentBg : t.inputBg, color: el.fontStyle === val ? t.accent : t.textMuted }}>{lbl}</button>
            ))}
          </div>
        </div>
      </Field>
      <Field label="Text color" t={t}><Swatch value={el.textColor || '#e2e4f0'} onChange={v => onUpdate({ textColor: v })} t={t} /></Field>
      {!isText && <Field label="Fill" t={t}><Swatch value={el.fill || t.nodeBg} onChange={v => onUpdate({ fill: v })} t={t} /></Field>}
      {!isText && <Field label="Stroke" t={t}><Swatch value={el.stroke || t.accent} onChange={v => onUpdate({ stroke: v })} t={t} /></Field>}
      {!isText && (
        <Field label={`Opacity ${Math.round((el.opacity ?? 1) * 100)}%`} t={t}>
          <input type="range" min={0.1} max={1} step={0.05} value={el.opacity ?? 1} onChange={e => onUpdate({ opacity: +e.target.value })} style={{ width: '100%', accentColor: t.accent, cursor: 'pointer' }} />
        </Field>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="X" t={t}><input type="number" value={Math.round(el.x || 0)} onChange={e => onUpdate({ x: +e.target.value })} style={inp(t)} /></Field>
        <Field label="Y" t={t}><input type="number" value={Math.round(el.y || 0)} onChange={e => onUpdate({ y: +e.target.value })} style={inp(t)} /></Field>
        {el.width !== undefined && <>
          <Field label="W" t={t}><input type="number" value={Math.round(el.width || 0)} onChange={e => onUpdate({ width: +e.target.value })} style={inp(t)} /></Field>
          <Field label="H" t={t}><input type="number" value={Math.round(el.height || 0)} onChange={e => onUpdate({ height: +e.target.value })} style={inp(t)} /></Field>
        </>}
      </div>
      {isComponent && el.type && <Field label="Type" t={t}><span style={{ display: 'inline-block', fontSize: 10, color: t.accent, background: t.accentBg, borderRadius: 4, padding: '3px 7px', fontWeight: 500 }}>{el.type}</span></Field>}
    </div>
  )
}

function Field({ label, children, t }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: t.textMuted, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function Swatch({ value, onChange, t }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
      <input type="color" value={value.startsWith('#') ? value : '#5b6af0'} onChange={e => onChange(e.target.value)} style={{ width: 28, height: 28, border: `1px solid ${t.border}`, borderRadius: 5, cursor: 'pointer', padding: 1, background: t.inputBg }} />
      {PRESETS.map(c => (
        <div key={c} onClick={() => onChange(c)} style={{ width: 18, height: 18, borderRadius: 4, background: c, cursor: 'pointer', border: value === c ? `2px solid ${t.text}` : `1px solid ${t.border}` }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.15)'} onMouseLeave={e => e.target.style.transform = 'scale(1)'} />
      ))}
    </div>
  )
}

const inp = t => ({ width: '100%', padding: '6px 8px', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 12, outline: 'none' })
