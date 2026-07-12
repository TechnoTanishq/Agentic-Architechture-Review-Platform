import { useState } from 'react'
import { X, Copy, Check, Send, ChevronDown, ChevronUp, Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import { parseToArchitecturalGraph } from '../utils/parser.js'
import { useTheme } from '../App.jsx'
import { projectsApi } from '../api.js'

/**
 * ReviewModal for the canvas flow.
 *
 * When projectId is provided it triggers the review via the Spring Boot backend
 * (POST /projects/{id}/review) and redirects to the report page.
 * When no projectId is available it falls back to calling the Python service
 * directly at http://localhost:8000/review for standalone/guest use.
 */
export default function ReviewModal({ elements, onClose, projectId, navigate }) {
  const t = useTheme()
  const [copied, setCopied]     = useState(false)
  const [sending, setSending]   = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [expandAnomaly, setExpandAnomaly] = useState(false)

  const parsed    = parseToArchitecturalGraph(elements)
  const jsonStr   = JSON.stringify(parsed, null, 2)
  const nodes     = parsed.components || []
  const anomalies = parsed.visual_anomalies_or_notes || []

  const copy = () => {
    navigator.clipboard.writeText(jsonStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendToAgents = async () => {
    setSending(true)
    setReviewError('')
    try {
      if (projectId) {
        // Integrated path: backend will parse + review using stored diagram
        // For canvas we send graph directly; re-trigger review on the project
        await projectsApi.triggerReview(projectId)
        onClose()
        navigate(`/report/${projectId}`)
      } else {
        // Standalone fallback: direct Python service call (no auth)
        const res = await fetch('http://localhost:8000/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graph: parsed, thread_id: '' }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
        onClose()
      }
    } catch (err) {
      setReviewError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 700, maxWidth: '95vw', maxHeight: '90vh', background: t.surface, borderRadius: 14, border: `1px solid ${t.border}`, boxShadow: '0 24px 80px rgba(0,0,0,0.45)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#5b6af0,#9b6af0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={15} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: t.text, margin: 0 }}>Review Architecture</h2>
              <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>Parsed and ready to send to the evaluation agents</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer', background: t.surfaceHover, color: t.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '14px 20px 0', flexShrink: 0 }}>
          {[['Architecture', parsed.detected_architecture_type || '—'], ['Components', nodes.length], ['Tech Stack', (parsed.primary_tech_stack || []).length + ' detected']].map(([l, v]) => (
            <div key={l} style={{ background: t.bg, borderRadius: 8, border: `1px solid ${t.border}`, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{l}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: t.accent, margin: 0 }}>{v}</p>
            </div>
          ))}
        </div>

        {anomalies.length > 0 && (
          <div style={{ padding: '10px 20px 0', flexShrink: 0 }}>
            <button onClick={() => setExpandAnomaly(a => !a)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: t.warning, fontSize: 12, fontWeight: 600 }}>
              <AlertCircle size={13} /> {anomalies.length} note{anomalies.length > 1 ? 's' : ''} detected {expandAnomaly ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {expandAnomaly && <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>{anomalies.map((a, i) => <li key={i} style={{ fontSize: 11, color: t.textMuted, marginBottom: 3 }}>{a}</li>)}</ul>}
          </div>
        )}

        {/* JSON preview */}
        <div style={{ flex: 1, margin: '12px 20px 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <p style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parsed Schema (ArchitecturalGraph)</p>
            <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 4, background: t.surfaceHover, border: `1px solid ${t.border}`, borderRadius: 5, color: copied ? t.success : t.textMuted, fontSize: 11, padding: '4px 9px', cursor: 'pointer', fontWeight: 500 }}>
              {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', borderRadius: 8, background: t.bg, border: `1px solid ${t.border}`, padding: '10px 14px' }}>
            <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.65, fontFamily: '"JetBrains Mono","Fira Code",monospace', color: t.success, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{jsonStr}</pre>
          </div>
        </div>

        {reviewError && (
          <div style={{ margin: '0 20px 12px', padding: '10px 14px', borderRadius: 8, background: '#e0575712', border: '1px solid #e0575730', fontSize: 12, color: t.danger }}>
            {reviewError}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: `1px solid ${t.border}`, flexShrink: 0, marginTop: 12 }}>
          <p style={{ fontSize: 11, color: t.textFaint }}>Sends to the 5-agent evaluation pipeline.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 7, background: t.surfaceHover, border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
            <button onClick={sendToAgents} disabled={sending}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 18px', borderRadius: 7, background: 'linear-gradient(135deg,#5b6af0,#7c6af0)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
              {sending ? <><Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Running…</> : <><Send size={13} /> Send to Agents</>}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
