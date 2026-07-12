import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal, Loader2, AlertCircle } from 'lucide-react'
import { authApi } from '../api.js'

export default function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode]       = useState('login')   // 'login' | 'register'
  const [form, setForm]       = useState({ username: '', email: '', password: '', organization: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = mode === 'login'
        ? { username: form.username, password: form.password }
        : { username: form.username, email: form.email, password: form.password, organization: form.organization }

      const data = mode === 'login' ? await authApi.login(payload) : await authApi.register(payload)
      localStorage.setItem('jwt', data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, justifyContent: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid #4F6EF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal size={16} color="#4F6EF7" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#E8EBF4', letterSpacing: '0.02em', fontFamily: "'JetBrains Mono', monospace" }}>ArchitectureAI</span>
        </div>

        {/* Card */}
        <div style={{ background: '#0D1220', border: '1px solid #1B2540', borderRadius: 14, padding: '32px 28px' }}>
          {/* Toggle */}
          <div style={{ display: 'flex', marginBottom: 28, background: '#070B14', borderRadius: 9, padding: 3, gap: 2 }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                style={{ flex: 1, padding: '9px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: mode === m ? '#4F6EF7' : 'transparent', color: mode === m ? '#fff' : '#4A5578', transition: 'all 0.15s' }}>
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Username" value={form.username} onChange={set('username')} placeholder="your_username" required />
            {mode === 'register' && (
              <>
                <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required />
                <Field label="Organization" value={form.organization} onChange={set('organization')} placeholder="Acme Corp (optional)" />
              </>
            )}
            <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required />

            {error && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle size={14} color="#EF4444" />
                <span style={{ fontSize: 12, color: '#EF4444' }}>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ marginTop: 4, padding: '12px', borderRadius: 9, border: 'none', background: loading ? '#2E3F6B' : '#4F6EF7', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
              {loading ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> {mode === 'login' ? 'Signing in…' : 'Creating account…'}</> : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, required }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#4A5578', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        style={{ width: '100%', padding: '10px 12px', background: '#070B14', border: '1px solid #1B2540', borderRadius: 8, color: '#E8EBF4', fontSize: 13, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
        onFocus={e => e.target.style.borderColor = '#4F6EF7'}
        onBlur={e => e.target.style.borderColor = '#1B2540'} />
    </div>
  )
}
