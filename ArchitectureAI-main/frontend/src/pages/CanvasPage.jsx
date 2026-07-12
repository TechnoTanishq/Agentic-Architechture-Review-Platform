import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Toolbar from '../components/Toolbar.jsx'
import CanvasArea from '../components/CanvasArea.jsx'
import PropertiesPanel from '../components/PropertiesPanel.jsx'
import ReviewModal from '../components/ReviewModal.jsx'
import { ThemeCtx } from '../App.jsx'
import { dark, light } from '../theme.js'

/**
 * CanvasPage — draw an architecture diagram from scratch using drag-and-drop
 * AWS/general components, then submit it to the AI review pipeline.
 *
 * When accessed with a :projectId route param the review is triggered via the
 * Spring Boot backend and the user is redirected to the report page.
 */
export default function CanvasPage() {
  const navigate = useNavigate()
  const { projectId } = useParams()   // may be undefined for standalone use

  const [isDark, setIsDark] = useState(true)
  const theme = isDark ? dark : light

  const [tool, setTool]               = useState('select')
  const [elements, setElements]       = useState([])
  const [selectedId, setSelectedId]   = useState(null)
  const [history, setHistory]         = useState([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [showJSON, setShowJSON]       = useState(false)
  const [showReview, setShowReview]   = useState(false)

  const selectedElement = elements.find(el => el.id === selectedId) || null

  const pushHistory = useCallback((newElements) => {
    setHistory(h => {
      const next = h.slice(0, historyIndex + 1)
      next.push(newElements)
      return next
    })
    setHistoryIndex(i => i + 1)
  }, [historyIndex])

  const addElement = useCallback((el) => {
    setElements(prev => {
      const next = [...prev, el]
      pushHistory(next)
      return next
    })
    setSelectedId(el.id)
  }, [pushHistory])

  const updateElement = useCallback((id, updates) => {
    setElements(prev => {
      const next = prev.map(el => el.id === id ? { ...el, ...updates } : el)
      pushHistory(next)
      return next
    })
  }, [pushHistory])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setElements(prev => {
      const next = prev.filter(el => el.id !== selectedId)
      pushHistory(next)
      return next
    })
    setSelectedId(null)
  }, [selectedId, pushHistory])

  const undo = useCallback(() => {
    setHistoryIndex(i => {
      if (i <= 0) return i
      const ni = i - 1
      setElements(history[ni])
      setSelectedId(null)
      return ni
    })
  }, [history])

  const redo = useCallback(() => {
    setHistoryIndex(i => {
      if (i >= history.length - 1) return i
      const ni = i + 1
      setElements(history[ni])
      setSelectedId(null)
      return ni
    })
  }, [history])

  const backTarget = projectId ? `/upload/${projectId}` : '/dashboard'

  return (
    <ThemeCtx.Provider value={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: theme.bg, color: theme.text }}>
        <Toolbar
          tool={tool} setTool={setTool}
          onUndo={undo} onRedo={redo}
          onDelete={deleteSelected}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          hasSelected={!!selectedId}
          isDark={isDark} onToggleTheme={() => setIsDark(d => !d)}
          onReview={() => setShowReview(true)}
          onBack={() => navigate(backTarget)}
          elementCount={elements.filter(e => e.kind !== 'arrow').length}
        />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <Sidebar onAddElement={addElement} />
          <CanvasArea
            tool={tool} setTool={setTool}
            elements={elements} setElements={setElements}
            selectedId={selectedId} setSelectedId={setSelectedId}
            onAddElement={addElement}
            onUpdateElement={updateElement}
            pushHistory={pushHistory}
          />
          <PropertiesPanel
            element={selectedElement}
            onUpdate={(updates) => selectedId && updateElement(selectedId, updates)}
            elements={elements}
            showJSON={showJSON} setShowJSON={setShowJSON}
          />
        </div>
        {showReview && (
          <ReviewModal
            elements={elements}
            onClose={() => setShowReview(false)}
            projectId={projectId}
            navigate={navigate}
          />
        )}
      </div>
    </ThemeCtx.Provider>
  )
}
