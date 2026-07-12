/**
 * Centralised API client for the ArchitectureAI Spring Boot backend.
 *
 * All requests go to /api/* which Vite proxies to http://localhost:8080 in dev.
 * In production point VITE_API_BASE to the deployed backend URL.
 *
 * Auth token is stored in localStorage as "jwt".
 */

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

function getToken() {
  return localStorage.getItem('jwt')
}

function authHeaders(extra = {}) {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function request(method, path, body, isMultipart = false) {
  const headers = isMultipart
    ? { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) }
    : authHeaders()

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isMultipart ? body : body ? JSON.stringify(body) : undefined,
  })

  // 204 No Content
  if (res.status === 204) return null

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (payload) => request('POST', '/auth/register', payload),
  login:    (payload) => request('POST', '/auth/login',    payload),
}

// ── Projects ──────────────────────────────────────────────────────────────────

export const projectsApi = {
  create:    (payload)             => request('POST',   '/projects',            payload),
  getAll:    ()                    => request('GET',    '/projects'),
  getOne:    (id)                  => request('GET',    `/projects/${id}`),
  update:    (id, payload)         => request('PUT',    `/projects/${id}`,      payload),
  delete:    (id)                  => request('DELETE', `/projects/${id}`),

  /** Upload a diagram image (multipart). Returns updated ProjectResponse. */
  upload: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return request('POST', `/projects/${id}/upload`, form, true)
  },

  /** Manually re-trigger the AI review (returns 202). */
  triggerReview: (id) => request('POST', `/projects/${id}/review`),

  /** Fetch the stored review report (returns ReviewReportResponse or 404). */
  getReport: (id) => request('GET', `/projects/${id}/report`),
}
