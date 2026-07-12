import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Upload, ArrowLeft, CheckCircle, Loader2, AlertCircle, FileImage, X, Terminal, ChevronRight } from 'lucide-react'
import { projectsApi } from '../api.js'

export default function UploadPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [file, setFile]         = useState(null)
  const [preview, setPreview]   = useState(null)
  const [status, setStatus]     = useState('idle')   // idle | loading | done | error
  const [error, setError]       = useState('')
  const [dragging, setDragging] = useState(false)

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, WEBP, etc.)')
      return
    }
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setStatus('idle')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const submit = async () => {
    if (!file) return
    setStatus('loading')
    setError('')
    try {
      // Upload to Spring Boot → Cloudinary → auto-triggers AI review pipeline
      await projectsApi.upload(projectId, file)
      setStatus('done')
      // Navigate to the report page — it will poll for COMPLETED status
      setTimeout(() => navigate(`/report/${projectId}`), 800)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setStatus('idle')
    setError('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0e12', color: '#e2e4f0', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px', height: 52, borderBottom: '1px solid #1e2130', background: 'rgba(13,14,18,0.9)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6b7090', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: '5px 8px', borderRadius: 6 }}>
          <ArrowLeft size={14} /> Dashboard
        </button>
        <div style={{ width: 1, height: 16, background: '#1e2130' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #4F6EF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal size={12} color="#4F6EF7" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e4f0' }}>ArchitectureAI</span>
        </div>
      </nav>

      <div style={{ flex: 1, maxWidth: 680, width: '100%', margin: '0 auto', padding: '52px 24px 48px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: '#5b6af015', border: '1px solid #5b6af030', marginBottom: 16 }}>
            <FileImage size={12} color="#5b6af0" />
            <span style={{ fontSize: 11, color: '#5b6af0', fontWeight: 600 }}>Image Upload</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 10px', lineHeight: 1.2 }}>Upload your architecture diagram</h1>
          <p style={{ fontSize: 14, color: '#6b7090', lineHeight: 1.65, margin: 0 }}>
            Drop any JPG or PNG of your system design. Gemini will parse every component and our 5-agent pipeline will generate a full scored review — automatically.
          </p>
        </div>

        {status !== 'done' && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && inputRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? '#5b6af0' : file ? '#34c77b' : '#2a2e40'}`, borderRadius: 14, padding: file ? '20px 22px' : '44px 24px', background: dragging ? '#5b6af00a' : '#13151c', cursor: file ? 'default' : 'pointer', transition: 'all 0.18s', marginBottom: 14 }}>
              <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              {!file ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: '#1e2130', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Upload size={24} color="#5b6af0" />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e4f0', margin: '0 0 6px' }}>Drop your diagram here</p>
                  <p style={{ fontSize: 13, color: '#6b7090', margin: 0 }}>or <span style={{ color: '#5b6af0', fontWeight: 500 }}>click to browse</span> — JPG, PNG, WEBP</p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <img src={preview} alt="preview" style={{ width: 120, height: 84, objectFit: 'cover', borderRadius: 9, border: '1px solid #2a2e40', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <CheckCircle size={13} color="#34c77b" />
                      <span style={{ fontSize: 12, color: '#34c77b', fontWeight: 600 }}>Ready to upload</span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e4f0', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                    <p style={{ fontSize: 11, color: '#6b7090', margin: 0 }}>{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); reset() }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7090', padding: 4 }}><X size={16} /></button>
                </div>
              )}
            </div>

            {error && (
              <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 14px', borderRadius: 9, background: '#e0575712', border: '1px solid #e0575730', marginBottom: 14 }}>
                <AlertCircle size={14} color="#e05757" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#e05757', margin: 0, lineHeight: 1.55 }}>{error}</p>
              </div>
            )}

            <button onClick={submit} disabled={!file || status === 'loading'}
              style={{ width: '100%', padding: 14, borderRadius: 10, background: !file ? '#1e2130' : 'linear-gradient(135deg,#5b6af0,#7c6af0)', border: 'none', color: !file ? '#3a3e55' : '#fff', fontSize: 14, fontWeight: 600, cursor: !file || status === 'loading' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: file ? '0 4px 20px rgba(91,106,240,0.35)' : 'none', transition: 'all 0.2s' }}>
              {status === 'loading'
                ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Uploading &amp; starting review…</>
                : <><Upload size={15} /> Upload &amp; start AI review</>}
            </button>

            <p style={{ fontSize: 11, color: '#3a3e55', textAlign: 'center', marginTop: 12 }}>
              The diagram is stored on Cloudinary. The AI review pipeline starts automatically after upload.
            </p>
          </>
        )}

        {status === 'done' && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <CheckCircle size={40} color="#34c77b" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#e2e4f0', marginBottom: 8 }}>Uploaded! Review pipeline started.</p>
            <p style={{ fontSize: 13, color: '#6b7090', marginBottom: 24 }}>Redirecting to your report…</p>
            <button onClick={() => navigate(`/report/${projectId}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 9, background: '#5b6af0', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Go to report <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
