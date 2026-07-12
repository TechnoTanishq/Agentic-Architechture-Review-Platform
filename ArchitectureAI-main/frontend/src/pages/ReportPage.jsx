import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Terminal, Sun, Moon, CheckCircle, AlertCircle, Loader2,
         ShieldAlert, Zap, DollarSign, Activity, ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { projectsApi } from '../api.js'
import { dark, light } from '../theme.js'

const AGENT_ICONS = {
  security_agent:    { icon: ShieldAlert,    color: '#e05757', label: 'Security' },
  scalability_agent: { icon: Zap,            color: '#f0a84a', label: 'Scalability' },
  cost_agent:        { icon: DollarSign,     color: '#34c77b', label: 'Cost' },
  reliability_agent: { icon: Activity,       color: '#5b6af0', label: 'Reliability' },
  compliance_agent:  { icon: ClipboardCheck, color: '#9b6af0', label: 'Compliance' },
}
const SEV_COLOR  = { critical: '#e05757', high: '#f0a84a', medium: '#e8c84a', low: '#34c77b' }
const CONF_COLOR = { OBSERVED: '#34c77b', INFERRED: '#f0a84a', NOT_VISIBLE: '#6b7090' }

const AGENT_MSGS = [
  { delay: 0,     text: '🔍  Parsing architecture components…' },
  { delay: 2500,  text: '🧠  Planner identifying risk domains…' },
  { delay: 5000,  text: '🛡️  Security agent scanning for vulnerabilities…' },
  { delay: 8000,  text: '⚡  Scalability agent checking for bottlenecks…' },
  { delay: 11000, text: '💰  Cost agent hunting for waste…' },
  { delay: 14000, text: '🔧  Reliability agent looking for failure modes…' },
  { delay: 17000, text: '📋  Compliance agent reviewing best practices…' },
  { delay: 20000, text: '✅  All agents done — compiling final report…' },
  { delay: 23000, text: '📊  Reviewer scoring the architecture…' },
]

function AgentLoader({ isDark }) {
  const t = isDark ? dark : light
  const [lines, setLines] = useState([])
  const [dots, setDots]   = useState('')
  useEffect(() => {
    const timers = AGENT_MSGS.map(({ delay, text }) => setTimeout(() => setLines(p => [...p, text]), delay))
    const dotTimer = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => { timers.forEach(clearTimeout); clearInterval(dotTimer) }
  }, [])
  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ position: 'relative', marginBottom: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#5b6af0,#9b6af0)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
          <Loader2 size={32} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
      <p style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 6 }}>Agents are reviewing your architecture{dots}</p>
      <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 32 }}>This usually takes 20–60 seconds</p>
      <div style={{ width: '100%', maxWidth: 520, background: isDark ? '#0d0e12' : '#1a1d2e', borderRadius: 12, border: `1px solid ${isDark ? '#1e2130' : '#2a2e40'}`, overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #1e2130', display: 'flex', gap: 6 }}>
          {['#e05757','#f0a84a','#34c77b'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ padding: '14px 16px', minHeight: 180, fontFamily: '"JetBrains Mono",monospace' }}>
          {lines.map((line, i) => (
            <div key={i} style={{ fontSize: 12, color: i === lines.length - 1 ? '#34c77b' : '#6b7090', marginBottom: 6 }}>{line}</div>
          ))}
          {lines.length < AGENT_MSGS.length && <span style={{ fontSize: 12, color: '#5b6af0', animation: 'blink 1s step-end infinite' }}>▌</span>}
        </div>
      </div>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn{ from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  )
}

function ScoreRing({ score, grade, t }) {
  const color = score >= 70 ? '#34c77b' : score >= 40 ? '#f0a84a' : '#e05757'
  const r = 44, circ = 2 * Math.PI * r, dash = (score / 100) * circ
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
        <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="55" cy="55" r={r} fill="none" stroke={t.border} strokeWidth="8" />
          <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 10, color: t.textMuted }}>/ 100</span>
        </div>
      </div>
      <div>
        {grade && (
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}15`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color }}>{grade}</span>
          </div>
        )}
        <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>Architecture Score</p>
      </div>
    </div>
  )
}

function Collapsible({ title, color, count, defaultOpen = true, children, t }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', borderBottom: `1px solid ${t.border}`, marginBottom: open ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</span>
          {count != null && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: `${color}18`, color, fontWeight: 600 }}>{count}</span>}
        </div>
        {open ? <ChevronUp size={14} color={t.textMuted} /> : <ChevronDown size={14} color={t.textMuted} />}
      </button>
      {open && children}
    </div>
  )
}

function FindingCard({ f, t }) {
  const [expanded, setExpanded] = useState(false)
  const sev = f.severity || 'low'
  const conf = f.confidence || 'INFERRED'
  const sevC  = SEV_COLOR[sev]  || '#6b7090'
  const confC = CONF_COLOR[conf] || '#6b7090'
  return (
    <div style={{ marginBottom: 8, borderRadius: 8, background: t.surface, border: `1px solid ${t.border}`, borderLeft: `3px solid ${sevC}`, overflow: 'hidden' }}>
      <button onClick={() => setExpanded(e => !e)} style={{ width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: sevC,  textTransform: 'uppercase', background: `${sevC}15`,  padding: '1px 7px', borderRadius: 10 }}>{sev}</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: confC, background: `${confC}12`, border: `1px solid ${confC}30`, padding: '1px 6px', borderRadius: 4 }}>{conf}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: t.text, flex: 1 }}>{f.issue}</span>
          {expanded ? <ChevronUp size={12} color={t.textMuted} /> : <ChevronDown size={12} color={t.textMuted} />}
        </div>
      </button>
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${t.border}` }}>
          {f.evidence && <p style={{ fontSize: 11, color: '#5b6af0', margin: '8px 0 4px', fontStyle: 'italic' }}>📎 {f.evidence}</p>}
          <p style={{ fontSize: 12, color: t.textMuted, margin: '6px 0 4px', lineHeight: 1.6 }}>{f.description}</p>
          <div style={{ padding: '7px 10px', borderRadius: 6, background: t.bg, marginTop: 6 }}>
            <p style={{ fontSize: 11, color: t.text, margin: 0, lineHeight: 1.6 }}>→ {f.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReportPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(true)
  const t = isDark ? dark : light

  const [projectStatus, setProjectStatus] = useState('REVIEWING')
  const [reportData, setReportData]       = useState(null)
  const [fetchError, setFetchError]       = useState('')
  const [activeTab, setActiveTab]         = useState('summary')
  const pollRef = useRef(null)

  // Poll project status until COMPLETED or FAILED
  const pollStatus = async () => {
    try {
      const project = await projectsApi.getOne(projectId)
      setProjectStatus(project.status)
      if (project.status === 'COMPLETED') {
        clearInterval(pollRef.current)
        const rpt = await projectsApi.getReport(projectId)
        setReportData(rpt)
      } else if (project.status === 'FAILED') {
        clearInterval(pollRef.current)
        setFetchError('The review pipeline encountered an error. Please try uploading again.')
      }
    } catch (err) {
      clearInterval(pollRef.current)
      setFetchError(err.message)
    }
  }

  useEffect(() => {
    pollStatus()
    pollRef.current = setInterval(pollStatus, 6000)
    return () => clearInterval(pollRef.current)
  }, [projectId])

  // Parse review_report JSON string from the stored report
  let report = null
  if (reportData?.reviewReportJson) {
    try { report = JSON.parse(reportData.reviewReportJson) } catch {}
  }

  // Parse agentFindings (stored as JSON strings)
  const agentFindings = (reportData?.agentFindings || []).map(s => {
    try { return JSON.parse(s) } catch { return null }
  }).filter(Boolean)

  if (projectStatus === 'REVIEWING' && !reportData) return <AgentLoader isDark={isDark} />

  if (fetchError) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <AlertCircle size={32} color={t.danger} />
      <p style={{ color: t.textMuted, fontSize: 14, maxWidth: 400, textAlign: 'center' }}>{fetchError}</p>
      <button onClick={() => navigate(`/upload/${projectId}`)} style={{ padding: '10px 20px', borderRadius: 8, background: '#5b6af0', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Upload again</button>
    </div>
  )

  const tabs = [{ id: 'summary', label: 'Summary' }, { id: 'findings', label: 'All Findings' }]

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'Inter', sans-serif" }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 52, borderBottom: `1px solid ${t.border}`, background: isDark ? 'rgba(13,14,18,0.92)' : 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 13 }}>
          <ArrowLeft size={14} /> Dashboard
        </button>
        <div style={{ width: 1, height: 16, background: t.border }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid #4F6EF7`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal size={12} color="#4F6EF7" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>ArchitectureAI</span>
          <span style={{ fontSize: 12, color: t.textMuted, marginLeft: 4 }}>/ Review Report</span>
        </div>
        <button onClick={() => setIsDark(d => !d)} style={{ padding: '6px 8px', borderRadius: 7, background: t.surface, border: `1px solid ${t.border}`, cursor: 'pointer', color: t.textMuted }}>
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </nav>

      {reportData && report && (
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 64px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: '#5b6af015', border: '1px solid #5b6af030', marginBottom: 12 }}>
                <CheckCircle size={11} color="#5b6af0" />
                <span style={{ fontSize: 11, color: '#5b6af0', fontWeight: 600 }}>Review Complete · {reportData.riskDomains?.length || 0} domains analysed</span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 10px', lineHeight: 1.2 }}>Architecture Review Report</h1>
              {report.verdict && <p style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.65, margin: 0, fontStyle: 'italic', maxWidth: 560 }}>"{report.verdict}"</p>}
            </div>
            <ScoreRing score={report.overall_score ?? 0} grade={report.grade} t={t} />
          </div>

          {reportData.riskDomains?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {reportData.riskDomains.map(domain => {
                const meta = AGENT_ICONS[`${domain}_agent`] || { color: '#6b7090', label: domain }
                const Icon = meta.icon
                return (
                  <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}>
                    {Icon && <Icon size={11} color={meta.color} />}
                    <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}>{meta.label || domain}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${t.border}`, marginBottom: 28 }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '9px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400, color: activeTab === tab.id ? '#5b6af0' : t.textMuted, borderBottom: activeTab === tab.id ? '2px solid #5b6af0' : '2px solid transparent', marginBottom: -1 }}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'summary' && report && <SummaryTab report={report} t={t} />}
          {activeTab === 'findings' && <FindingsTab agentFindings={agentFindings} t={t} />}
        </div>
      )}
    </div>
  )
}

function SummaryTab({ report, t }) {
  const tryParse = (v) => { if (typeof v === 'object') return v; try { return JSON.parse(v) } catch { return v } }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div>
        {report.critical_blockers?.length > 0 && (
          <Collapsible title="Critical Blockers" color="#e05757" count={report.critical_blockers.length} t={t}>
            {report.critical_blockers.map((b, i) => { const item = tryParse(b); return (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '9px 11px', borderRadius: 7, background: '#e0575710', border: '1px solid #e0575730', alignItems: 'flex-start' }}>
                <span style={{ color: '#e05757', fontSize: 13, flexShrink: 0 }}>✗</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: t.text, margin: '0 0 2px' }}>{item?.issue || item}</p>
                  {item?.why && <p style={{ fontSize: 11, color: t.textMuted, margin: 0, lineHeight: 1.5 }}>{item.why}</p>}
                </div>
              </div>
            )})}
          </Collapsible>
        )}
        {report.quick_wins?.length > 0 && (
          <Collapsible title="Quick Wins" color="#34c77b" count={report.quick_wins.length} t={t}>
            {report.quick_wins.map((qw, i) => { const item = tryParse(qw); return (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ color: '#34c77b', fontSize: 13, flexShrink: 0 }}>✓</span>
                <div>
                  <p style={{ fontSize: 12, color: t.text, margin: '0 0 1px', fontWeight: 500 }}>{item?.action || item}</p>
                  {item?.benefit && <p style={{ fontSize: 11, color: t.textMuted, margin: 0 }}>{item.benefit}</p>}
                </div>
              </div>
            )})}
          </Collapsible>
        )}
        {report.strengths?.length > 0 && (
          <Collapsible title="Strengths" color="#5b6af0" count={report.strengths.length} t={t}>
            {report.strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start' }}>
                <span style={{ color: '#5b6af0', fontSize: 12, flexShrink: 0 }}>★</span>
                <p style={{ fontSize: 12, color: t.textMuted, margin: 0, lineHeight: 1.5 }}>{s}</p>
              </div>
            ))}
          </Collapsible>
        )}
      </div>
      <div>
        {report.priority_fixes?.length > 0 && (
          <Collapsible title="Priority Fixes" color="#f0a84a" count={report.priority_fixes.length} t={t}>
            {report.priority_fixes.map((fix, i) => { const item = tryParse(fix); return (
              <div key={i} style={{ marginBottom: 8, padding: '10px 12px', borderRadius: 7, background: t.surface, border: `1px solid ${t.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, gap: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: t.text, margin: 0 }}>
                    <span style={{ color: '#f0a84a', marginRight: 6 }}>{item?.priority}.</span>{item?.issue || item}
                  </p>
                  {item?.estimated_effort && <span style={{ fontSize: 10, color: t.textMuted, background: t.bg, padding: '2px 7px', borderRadius: 4, border: `1px solid ${t.border}`, flexShrink: 0 }}>{item.estimated_effort}</span>}
                </div>
                {item?.fix && <p style={{ fontSize: 11, color: t.textMuted, margin: '0 0 4px' }}>{item.fix}</p>}
                {item?.agent && <span style={{ fontSize: 10, color: '#5b6af0', fontWeight: 500 }}>[{item.agent.replace('_agent','')}]</span>}
              </div>
            )})}
          </Collapsible>
        )}
        {report.recommended_next_steps?.length > 0 && (
          <Collapsible title="Recommended Next Steps" color="#9b6af0" t={t}>
            {report.recommended_next_steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: '#9b6af0', fontWeight: 700, flexShrink: 0, marginTop: 1, background: '#9b6af015', border: '1px solid #9b6af030', borderRadius: 4, padding: '2px 6px' }}>{i + 1}</span>
                <p style={{ fontSize: 12, color: t.textMuted, margin: 0, lineHeight: 1.6 }}>{step}</p>
              </div>
            ))}
          </Collapsible>
        )}
      </div>
    </div>
  )
}

function FindingsTab({ agentFindings, t }) {
  return (
    <div>
      {agentFindings.map((block, ai) => {
        const meta = AGENT_ICONS[block.agent] || { color: '#6b7090', label: block.agent }
        const Icon = meta.icon
        return (
          <div key={ai} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icon && <Icon size={14} color={meta.color} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>{meta.label} Agent</span>
              <span style={{ fontSize: 11, color: t.textMuted }}>— {block.summary}</span>
            </div>
            {(block.findings || []).map((f, fi) => <FindingCard key={fi} f={f} t={t} />)}
          </div>
        )
      })}
      {agentFindings.length === 0 && <p style={{ color: t.textMuted, fontSize: 13 }}>No findings available.</p>}
    </div>
  )
}
