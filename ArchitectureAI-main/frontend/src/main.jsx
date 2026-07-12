import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing    from './pages/Landing.jsx'
import AuthPage   from './pages/AuthPage.jsx'
import Dashboard  from './pages/Dashboard.jsx'
import UploadPage from './pages/UploadPage.jsx'
import CanvasPage from './pages/CanvasPage.jsx'
import ReportPage from './pages/ReportPage.jsx'

/** Route guard — redirects to /auth if no JWT in localStorage */
function Private({ children }) {
  return localStorage.getItem('jwt') ? children : <Navigate to="/auth" replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<Landing />} />
        <Route path="/auth"     element={<AuthPage />} />
        <Route path="/dashboard" element={<Private><Dashboard /></Private>} />
        <Route path="/upload/:projectId" element={<Private><UploadPage /></Private>} />
        <Route path="/canvas/:projectId" element={<Private><CanvasPage /></Private>} />
        <Route path="/report/:projectId" element={<Private><ReportPage /></Private>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
