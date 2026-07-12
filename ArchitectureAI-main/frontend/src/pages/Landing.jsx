import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal, Upload, ArrowRight, Shield, Zap, BarChart2, RefreshCw, CheckCircle, ChevronRight, Moon, Sun } from 'lucide-react'

const C = { bg:'#070B14', bgCard:'#0D1220', border:'#1B2540', borderHover:'#2E3F6B', text:'#E8EBF4', muted:'#4A5578', indigo:'#4F6EF7', teal:'#00D4AA', amber:'#F59E0B', red:'#EF4444', green:'#22C55E' }
const CL = { bg:'#F0F2F8', bgCard:'#FFFFFF', border:'#DDE2F0', borderHover:'#9AAAD4', text:'#0D1220', muted:'#5B6A94', indigo:'#3B5BDB', teal:'#00A382', amber:'#D97706', red:'#DC2626', green:'#16A34A' }

function useCount(target, duration = 1200, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => {
      let start = null
      const step = ts => { if (!start) start = ts; const p = Math.min((ts - start) / duration, 1); setVal(Math.floor(p * target)); if (p < 1) requestAnimationFrame(step) }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(t)
  }, [target, duration, delay])
  return val
}

export default function Landing() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(true)
  const c = dark ? C : CL
  const isLoggedIn = !!localStorage.getItem('jwt')

  return (
    <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${c.border}`, background: dark ? 'rgba(7,11,20,0.9)' : 'rgba(240,242,248,0.9)', backdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${c.indigo}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Terminal size={13} color={c.indigo} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.02em', fontFamily: "'JetBrains Mono', monospace" }}>ArchitectureAI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setDark(d => !d)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${c.border}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.muted }}>
              {dark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            {isLoggedIn
              ? <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', borderRadius: 8, background: c.indigo, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Dashboard</button>
              : <>
                  <button onClick={() => navigate('/auth')} style={{ padding: '7px 14px', borderRadius: 7, background: 'transparent', border: `1px solid ${c.border}`, color: c.muted, fontSize: 13, cursor: 'pointer' }}>Sign in</button>
                  <button onClick={() => navigate('/auth')} style={{ padding: '7px 14px', borderRadius: 7, background: c.indigo, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Get started</button>
                </>
            }
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '100px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: 4, border: `1px solid ${c.border}`, marginBottom: 28, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: c.teal, background: `${c.teal}12`, letterSpacing: '0.04em' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.teal, display: 'inline-block' }} />
          5-agent LangGraph pipeline · Gemini Vision parser
        </div>
        <h1 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', margin: '0 0 20px' }}>
          AI review for your<br /><span style={{ color: c.indigo }}>cloud architecture</span>
        </h1>
        <p style={{ fontSize: 16, color: c.muted, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px' }}>
          Upload your architecture diagram. Five specialist agents — security, scalability, cost, reliability, compliance — analyse it in parallel and return a scored, prioritised report. Backed by user accounts and project history.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate(isLoggedIn ? '/dashboard' : '/auth')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 10, background: c.indigo, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {isLoggedIn ? 'Go to Dashboard' : 'Get started free'} <ArrowRight size={14} />
          </button>
          <button onClick={() => navigate('/auth')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 10, background: 'transparent', border: `1px solid ${c.border}`, color: c.muted, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            <Upload size={13} /> Upload diagram
          </button>
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)' }}>
          {[
            [useCount(5,1000,200), 'Specialist agents', 'security · cost · scale · reliability · compliance'],
            [useCount(3,1200,400)+'x', 'LLM calls', 'plan → agents → reviewer'],
            [useCount(45,1400,600)+'s', 'Avg review time', 'end to end'],
          ].map(([n, l, s], i) => (
            <div key={l} style={{ padding: '32px 24px', textAlign: 'center', borderRight: i < 2 ? `1px solid ${c.border}` : 'none' }}>
              <p style={{ fontSize: 34, fontWeight: 800, color: c.text, margin: '0 0 4px', fontFamily: "'JetBrains Mono', monospace" }}>{n}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: c.text, margin: '0 0 2px' }}>{l}</p>
              <p style={{ fontSize: 12, color: c.muted, margin: 0 }}>{s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <h2 style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 32, textAlign: 'center' }}>Five autonomous agents, one complete evaluation</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 10 }}>
          {[
            { icon: Shield,      color: '#EF4444', name: 'Security',     checks: 'IAM · encryption · public endpoints' },
            { icon: Zap,         color: '#4F6EF7', name: 'Scalability',  checks: 'ASG · SPOF · read replicas' },
            { icon: BarChart2,   color: '#F59E0B', name: 'Cost',         checks: 'on-demand · NAT · storage tiers' },
            { icon: RefreshCw,   color: '#00D4AA', name: 'Reliability',  checks: 'multi-AZ · backups · DLQ' },
            { icon: CheckCircle, color: '#A78BFA', name: 'Compliance',   checks: 'CloudTrail · WAF · IaC coverage' },
          ].map(a => {
            const Icon = a.icon
            return (
              <div key={a.name} style={{ padding: '16px 18px', borderRadius: 10, border: `1px solid ${c.border}`, background: c.bgCard, transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = a.color + '60'}
                onMouseLeave={e => e.currentTarget.style.borderColor = c.border}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: a.color + '14', border: `1px solid ${a.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon size={13} color={a.color} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: c.text, margin: '0 0 4px' }}>{a.name}</p>
                <p style={{ fontSize: 11, color: c.muted, margin: 0 }}>{a.checks}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1100, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ borderRadius: 14, border: `1px solid ${c.border}`, background: c.bgCard, padding: '52px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: c.teal, letterSpacing: '0.08em', margin: '0 0 10px' }}>// ready to start</p>
            <h2 style={{ fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 700, color: c.text, margin: '0 0 8px' }}>Run your first review now</h2>
            <p style={{ fontSize: 14, color: c.muted, margin: 0 }}>Free to use. Results in under a minute.</p>
          </div>
          <button onClick={() => navigate(isLoggedIn ? '/dashboard' : '/auth')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, background: c.indigo, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {isLoggedIn ? 'Open Dashboard' : 'Get started'} <ChevronRight size={14} />
          </button>
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${c.border}`, padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: c.muted, margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>© 2026 ArchitectureAI · MIT licence</p>
      </footer>
    </div>
  )
}
