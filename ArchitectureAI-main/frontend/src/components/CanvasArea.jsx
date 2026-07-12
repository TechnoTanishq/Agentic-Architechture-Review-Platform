import { useRef, useState, useEffect, useCallback, forwardRef } from 'react'
import { Stage, Layer, Rect, Ellipse, Text, Arrow, Line, Group, Circle, Transformer } from 'react-konva'
import { useTheme } from '../App.jsx'
import { buildElement } from './Sidebar.jsx'

const uid = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

function getAnchors(el) {
  const cx = el.x + (el.width || 96) / 2, cy = el.y + (el.height || 84) / 2
  return [
    { pos: 'top',    x: cx,                      y: el.y },
    { pos: 'right',  x: el.x + (el.width || 96), y: cy },
    { pos: 'bottom', x: cx,                      y: el.y + (el.height || 84) },
    { pos: 'left',   x: el.x,                    y: cy },
  ]
}

function ComponentNode({ el, isSelected, onSelect, onUpdateElement, onDragEnd, onDblClick, onStartConnect, onHoverChange, theme: t }) {
  const groupRef = useRef(null), trRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  useEffect(() => { if (isSelected && trRef.current && groupRef.current) { trRef.current.nodes([groupRef.current]); trRef.current.getLayer()?.batchDraw() } }, [isSelected])
  const fill = el.fill || t.nodeBg
  const stroke = isSelected ? t.nodeSelected : hovered ? t.accent : (el.stroke || el.color || t.nodeBorder)
  const anchors = (isSelected || hovered) ? getAnchors({ ...el, x: 0, y: 0 }) : []
  return (
    <>
      <Group ref={groupRef} x={el.x} y={el.y} draggable
        onClick={e => { e.cancelBubble = true; onSelect(el.id) }}
        onDragEnd={e => onDragEnd(el.id, e.target.x(), e.target.y())}
        onDblClick={() => onDblClick?.(el.id)}
        onMouseEnter={() => { setHovered(true); onHoverChange?.(el.id, true) }}
        onMouseLeave={() => { setHovered(false); onHoverChange?.(el.id, false) }}>
        <Rect width={el.width} height={el.height} fill={fill} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} cornerRadius={10} shadowBlur={isSelected ? 14 : hovered ? 6 : 0} shadowColor={t.nodeSelectedShadow} shadowOpacity={1} />
        <Rect x={0} y={0} width={el.width} height={3} fill={el.color || el.stroke || t.accent} cornerRadius={[10, 10, 0, 0]} />
        <Text text={el.emoji || '⬜'} x={0} y={10} width={el.width} align="center" fontSize={26} />
        <Text text={el.label || el.name || ''} x={6} y={el.height - 20} width={el.width - 12} align="center" fontSize={el.fontSize || 11} fontStyle={el.fontStyle || '500'} fill={el.textColor || t.text} ellipsis fontFamily="Inter, sans-serif" />
        {anchors.map(a => (
          <Circle key={a.pos} x={a.x} y={a.y} radius={5} fill={t.accent} stroke={t.surface} strokeWidth={1.5}
            onMouseDown={e => { e.cancelBubble = true; onStartConnect(el.id, a.x + el.x, a.y + el.y) }}
            onMouseEnter={e => { e.target.getStage().container().style.cursor = 'crosshair' }}
            onMouseLeave={e => { e.target.getStage().container().style.cursor = 'default' }} />
        ))}
      </Group>
      {isSelected && <Transformer ref={trRef} rotateEnabled={false} anchorSize={7} anchorCornerRadius={3} anchorFill={t.accent} anchorStroke={t.surface} borderStroke={t.accent} borderDash={[4, 2]} boundBoxFunc={(_, n) => n}
        onTransformEnd={() => { const node = groupRef.current; if (!node) return; onUpdateElement(el.id, { x: node.x(), y: node.y(), width: Math.max(60, node.width() * node.scaleX()), height: Math.max(50, node.height() * node.scaleY()) }); node.scaleX(1); node.scaleY(1) }} />}
    </>
  )
}

function ContainerNode({ el, isSelected, onSelect, onUpdateElement, onDragEnd, theme: t }) {
  const groupRef = useRef(null), trRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  useEffect(() => { if (isSelected && trRef.current && groupRef.current) { trRef.current.nodes([groupRef.current]); trRef.current.getLayer()?.batchDraw() } }, [isSelected])
  const fill = el.fill || (el.color ? el.color + '12' : t.accentBg)
  const stroke = isSelected ? t.nodeSelected : hovered ? el.color || t.accent : el.stroke || el.color || t.nodeBorder
  return (
    <>
      <Group ref={groupRef} x={el.x} y={el.y} draggable
        onClick={e => { e.cancelBubble = true; onSelect(el.id) }}
        onDragEnd={e => onDragEnd(el.id, e.target.x(), e.target.y())}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <Rect width={el.width} height={el.height} fill={fill} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} dash={[8, 5]} cornerRadius={10} />
        <Text text={`${el.emoji || '📦'}  ${el.label || el.name || ''}`} x={10} y={8} fontSize={el.fontSize || 12} fontStyle="600" fill={el.textColor || el.color || t.accent} fontFamily="Inter, sans-serif" />
      </Group>
      {isSelected && <Transformer ref={trRef} rotateEnabled={false} anchorSize={7} anchorCornerRadius={3} anchorFill={t.accent} anchorStroke={t.surface} borderStroke={t.accent} borderDash={[4, 2]} boundBoxFunc={(_, n) => n}
        onTransformEnd={() => { const node = groupRef.current; if (!node) return; onUpdateElement(el.id, { x: node.x(), y: node.y(), width: Math.max(80, node.width() * node.scaleX()), height: Math.max(60, node.height() * node.scaleY()) }); node.scaleX(1); node.scaleY(1) }} />}
    </>
  )
}

function ShapeNode({ el, isSelected, onSelect, onUpdateElement, onDragEnd, onDblClick, onStartConnect, onHoverChange, theme: t }) {
  const shapeRef = useRef(null), trRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  useEffect(() => { if (isSelected && trRef.current && shapeRef.current) { trRef.current.nodes([shapeRef.current]); trRef.current.getLayer()?.batchDraw() } }, [isSelected])
  const fill = el.fill || t.nodeBg
  const stroke = isSelected ? t.nodeSelected : hovered ? t.accent : (el.stroke || t.nodeBorder)
  const anchors = (isSelected || hovered) ? getAnchors(el) : []
  const shared = { fill, stroke, strokeWidth: isSelected ? 2 : 1.5, draggable: true, shadowBlur: isSelected ? 12 : hovered ? 4 : 0, shadowColor: t.nodeSelectedShadow, onClick: e => { e.cancelBubble = true; onSelect(el.id) }, onDragEnd: e => onDragEnd(el.id, e.target.x(), e.target.y()), onDblClick: () => onDblClick?.(el.id), onMouseEnter: () => { setHovered(true); onHoverChange?.(el.id, true) }, onMouseLeave: () => { setHovered(false); onHoverChange?.(el.id, false) }, opacity: el.opacity ?? 1 }
  return (
    <>
      {el.shape === 'ellipse'
        ? <Ellipse ref={shapeRef} x={el.x + el.width/2} y={el.y + el.height/2} radiusX={el.width/2} radiusY={el.height/2} {...shared} onDragEnd={e => onDragEnd(el.id, e.target.x() - el.width/2, e.target.y() - el.height/2)} />
        : <Rect ref={shapeRef} x={el.x} y={el.y} width={el.width} height={el.height} cornerRadius={el.shape === 'rounded' ? 12 : 0} {...shared} />
      }
      {el.label && <Text x={el.x + 6} y={el.y + el.height/2 - (el.fontSize || 12)} width={el.width - 12} align="center" text={el.label} fontSize={el.fontSize || 12} fontStyle={el.fontStyle || 'normal'} fill={el.textColor || t.text} fontFamily="Inter, sans-serif" listening={false} />}
      {anchors.map(a => (
        <Circle key={a.pos} x={a.x} y={a.y} radius={5} fill={t.accent} stroke={t.surface} strokeWidth={1.5}
          onMouseDown={e => { e.cancelBubble = true; onStartConnect(el.id, a.x, a.y) }}
          onMouseEnter={e => { e.target.getStage().container().style.cursor = 'crosshair' }}
          onMouseLeave={e => { e.target.getStage().container().style.cursor = 'default' }} />
      ))}
      {isSelected && <Transformer ref={trRef} rotateEnabled={false} anchorSize={7} anchorCornerRadius={3} anchorFill={t.accent} anchorStroke={t.surface} borderStroke={t.accent} borderDash={[4, 2]} boundBoxFunc={(_, n) => n}
        onTransformEnd={() => { const node = shapeRef.current; if (!node) return; onUpdateElement(el.id, { x: node.x(), y: node.y(), width: Math.max(30, node.width() * node.scaleX()), height: Math.max(30, node.height() * node.scaleY()) }); node.scaleX(1); node.scaleY(1) }} />}
    </>
  )
}

function TextNode({ el, isSelected, onSelect, onDragEnd, onDblClick, theme: t }) {
  const textRef = useRef(null), trRef = useRef(null)
  useEffect(() => { if (isSelected && trRef.current && textRef.current) { trRef.current.nodes([textRef.current]); trRef.current.getLayer()?.batchDraw() } }, [isSelected])
  return (
    <>
      <Text ref={textRef} x={el.x} y={el.y} text={el.text || 'Text'} fontSize={el.fontSize || 15} fontStyle={el.fontStyle || 'normal'} fill={el.textColor || t.text} fontFamily="Inter, sans-serif" draggable onClick={e => { e.cancelBubble = true; onSelect(el.id) }} onDragEnd={e => onDragEnd(el.id, e.target.x(), e.target.y())} onDblClick={() => onDblClick?.(el.id)} />
      {isSelected && <Transformer ref={trRef} rotateEnabled={false} enabledAnchors={['middle-left', 'middle-right']} anchorSize={7} anchorCornerRadius={3} anchorFill={t.accent} anchorStroke={t.surface} borderStroke={t.accent} borderDash={[4, 2]} />}
    </>
  )
}

function ArrowNode({ el, isSelected, onSelect, theme: t }) {
  return <Arrow points={el.points} stroke={isSelected ? t.accent : (el.stroke || t.textMuted)} fill={isSelected ? t.accent : (el.stroke || t.textMuted)} strokeWidth={isSelected ? 2 : 1.5} pointerLength={9} pointerWidth={7} tension={el.curved ? 0.4 : 0} lineCap="round" lineJoin="round" onClick={e => { e.cancelBubble = true; onSelect(el.id) }} hitStrokeWidth={12} />
}

function InlineEditor({ el, stagePos, scale, onConfirm, onCancel, t }) {
  const [val, setVal] = useState(el.text || el.label || '')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])
  return (
    <div style={{ position: 'absolute', top: (el.y + stagePos.y) * scale, left: (el.x + stagePos.x) * scale, zIndex: 200 }}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onConfirm(val); if (e.key === 'Escape') onCancel() }}
        onBlur={() => onConfirm(val)}
        style={{ background: t.nodeBg, border: `2px solid ${t.accent}`, borderRadius: 6, color: t.text, fontSize: (el.fontSize || 13) * scale, padding: '3px 8px', minWidth: 90, outline: 'none', fontFamily: 'Inter, sans-serif', boxShadow: `0 0 0 3px ${t.accentBg}` }} />
    </div>
  )
}

const CanvasArea = forwardRef(function CanvasArea({ tool, setTool, elements, setElements, selectedId, setSelectedId, onAddElement, onUpdateElement, pushHistory }, _ref) {
  const t = useTheme()
  const containerRef = useRef(null), stageRef = useRef(null)
  const [size, setSize] = useState({ w: 900, h: 600 })
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const isPanning = useRef(false), lastPointer = useRef(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [connecting, setConnecting] = useState(null)
  const [drawing, setDrawing] = useState(null)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    const obs = new ResizeObserver(entries => { for (const e of entries) setSize({ w: e.contentRect.width, h: e.contentRect.height }) })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const down = e => {
      if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); setSpaceHeld(true) }
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'v' || e.key === 'V') setTool('select')
      if (e.key === 't' || e.key === 'T') setTool('text')
      if (e.key === 'r' || e.key === 'R') setTool('rect')
      if (e.key === 'e' || e.key === 'E') setTool('ellipse')
      if (e.key === 'l' || e.key === 'L') setTool('line')
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setElements(prev => { const next = prev.filter(el => el.id !== selectedId); pushHistory(next); return next })
        setSelectedId(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '=') { e.preventDefault(); setScale(s => Math.min(3, s * 1.1)) }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setScale(s => Math.max(0.1, s / 1.1)) }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setScale(1); setStagePos({ x: 0, y: 0 }) }
    }
    const up = e => { if (e.key === ' ') setSpaceHeld(false) }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [selectedId, elements])

  const handleWheel = useCallback(e => {
    e.evt.preventDefault()
    const stage = stageRef.current, pointer = stage.getPointerPosition()
    const dir = e.evt.deltaY > 0 ? -1 : 1, factor = 1.08
    const newScale = dir > 0 ? Math.min(3, scale * factor) : Math.max(0.1, scale / factor)
    setStagePos({ x: pointer.x - (pointer.x - stagePos.x) * (newScale / scale), y: pointer.y - (pointer.y - stagePos.y) * (newScale / scale) })
    setScale(newScale)
  }, [scale, stagePos])

  const toCanvas = (pos) => ({ x: (pos.x - stagePos.x) / scale, y: (pos.y - stagePos.y) / scale })

  const handleDrop = e => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/archcanvas')
    if (!raw) return
    const item = JSON.parse(raw)
    const rect = containerRef.current.getBoundingClientRect()
    const pos = toCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    const id = uid(), el = buildElement(id, item)
    el.x = pos.x - (el.width || 96) / 2; el.y = pos.y - (el.height || 84) / 2
    onAddElement(el)
  }

  const handleMouseDown = e => {
    const stage = stageRef.current, pos = stage.getPointerPosition()
    if (!pos) return
    const cp = toCanvas(pos)
    if (spaceHeld || e.evt.button === 1) { isPanning.current = true; lastPointer.current = pos; return }
    if (tool === 'select') { if (e.target === stage) setSelectedId(null); return }
    if (tool === 'text') { const id = uid(); onAddElement({ id, kind: 'text', text: 'Label', x: cp.x, y: cp.y, fontSize: 15, fontStyle: 'normal', textColor: null }); setEditingId(id); setTool('select'); return }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'line') setDrawing({ tool, x: cp.x, y: cp.y, x2: cp.x, y2: cp.y })
  }

  const handleMouseMove = e => {
    const stage = stageRef.current, pos = stage.getPointerPosition()
    if (!pos) return
    if (isPanning.current && lastPointer.current) { setStagePos(p => ({ x: p.x + (pos.x - lastPointer.current.x), y: p.y + (pos.y - lastPointer.current.y) })); lastPointer.current = pos; return }
    const cp = toCanvas(pos)
    if (connecting) { setConnecting(c => ({ ...c, x2: cp.x, y2: cp.y })); return }
    if (drawing) setDrawing(d => ({ ...d, x2: cp.x, y2: cp.y }))
  }

  const handleMouseUp = e => {
    const stage = stageRef.current, pos = stage.getPointerPosition()
    if (isPanning.current) { isPanning.current = false; lastPointer.current = null; return }
    if (connecting && pos) {
      const cp = toCanvas(pos)
      const target = elements.find(el => { if (el.id === connecting.fromId || el.kind === 'arrow' || el.kind === 'text') return false; const ex = el.x, ey = el.y, ew = el.width || 96, eh = el.height || 84; return cp.x >= ex - 10 && cp.x <= ex + ew + 10 && cp.y >= ey - 10 && cp.y <= ey + eh + 10 })
      const id = uid()
      if (target) { const tx = target.x + (target.width || 96) / 2, ty = target.y + (target.height || 84) / 2; onAddElement({ id, kind: 'arrow', points: [connecting.x1, connecting.y1, tx, ty], stroke: null, strokeWidth: 1.5, fromId: connecting.fromId, toId: target.id }) }
      else { onAddElement({ id, kind: 'arrow', points: [connecting.x1, connecting.y1, cp.x, cp.y], stroke: null, strokeWidth: 1.5, fromId: connecting.fromId }) }
      setConnecting(null); return
    }
    if (drawing) {
      const { tool: dt, x, y, x2, y2 } = drawing, w = Math.abs(x2 - x), h = Math.abs(y2 - y)
      if (w > 8 || h > 8) {
        const id = uid()
        if (dt === 'line') onAddElement({ id, kind: 'arrow', points: [x, y, x2, y2], stroke: null, strokeWidth: 1.5 })
        else onAddElement({ id, kind: 'shape', shape: dt, x: Math.min(x, x2), y: Math.min(y, y2), width: w, height: h, fill: null, stroke: null, strokeWidth: 1.5, label: '', fontSize: 12, fontStyle: 'normal', textColor: null, opacity: 1 })
        setTool('select')
      }
      setDrawing(null)
    }
  }

  const startConnect = (fromId, x1, y1) => setConnecting({ fromId, x1, y1, x2: x1, y2: y1 })

  const confirmEdit = (id, val) => {
    const el = elements.find(e => e.id === id)
    if (!el) { setEditingId(null); return }
    onUpdateElement(id, el.kind === 'text' ? { text: val } : { label: val })
    setEditingId(null)
  }

  const editingEl = editingId ? elements.find(e => e.id === editingId) : null
  const cursor = spaceHeld ? (isPanning.current ? 'grabbing' : 'grab') : tool === 'text' ? 'text' : (tool === 'rect' || tool === 'ellipse' || tool === 'line') ? 'crosshair' : connecting ? 'crosshair' : 'default'
  const sorted = [...elements].sort((a, b) => { const o = { container: 0, shape: 1, component: 2, text: 3, arrow: 4 }; return (o[a.kind] ?? 2) - (o[b.kind] ?? 2) })

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', background: t.canvasBg, overflow: 'hidden', cursor }} onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width="100%" height="100%">
        <defs>
          <pattern id="grid-dots" x={stagePos.x % (24 * scale)} y={stagePos.y % (24 * scale)} width={24 * scale} height={24 * scale} patternUnits="userSpaceOnUse">
            <circle cx={1.5} cy={1.5} r={1.2} fill={t.canvasDot} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-dots)" />
      </svg>

      <Stage ref={stageRef} width={size.w} height={size.h} x={stagePos.x} y={stagePos.y} scaleX={scale} scaleY={scale} onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <Layer>
          {sorted.map(el => {
            const sel = el.id === selectedId
            const common = { key: el.id, el, isSelected: sel, onSelect: setSelectedId, onUpdateElement, onDragEnd: (id, x, y) => onUpdateElement(id, { x, y }), onDblClick: setEditingId, onStartConnect: startConnect, onHoverChange: () => {}, theme: t }
            if (el.kind === 'component') return <ComponentNode {...common} />
            if (el.kind === 'container') return <ContainerNode {...common} />
            if (el.kind === 'shape') return <ShapeNode {...common} />
            if (el.kind === 'text') return <TextNode {...common} />
            if (el.kind === 'arrow') return <ArrowNode {...common} />
            return null
          })}

          {drawing && (() => {
            const { tool: dt, x, y, x2, y2 } = drawing, rx = Math.min(x, x2), ry = Math.min(y, y2), w = Math.abs(x2 - x), h = Math.abs(y2 - y)
            if (dt === 'ellipse') return <Ellipse x={rx + w/2} y={ry + h/2} radiusX={w/2} radiusY={h/2} fill={t.accentBg} stroke={t.accent} strokeWidth={1.5} dash={[5,3]} />
            if (dt === 'line') return <Line points={[x,y,x2,y2]} stroke={t.textMuted} strokeWidth={1.5} dash={[5,3]} />
            return <Rect x={rx} y={ry} width={w} height={h} fill={t.accentBg} stroke={t.accent} strokeWidth={1.5} dash={[5,3]} />
          })()}

          {connecting && <Arrow points={[connecting.x1, connecting.y1, connecting.x2, connecting.y2]} stroke={t.accent} fill={t.accent} strokeWidth={1.5} dash={[6,3]} pointerLength={8} pointerWidth={6} opacity={0.7} />}
        </Layer>
      </Stage>

      {editingEl && <InlineEditor el={editingEl} stagePos={stagePos} scale={scale} onConfirm={v => confirmEdit(editingEl.id, v)} onCancel={() => setEditingId(null)} t={t} />}

      <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: '5px 14px', fontSize: 11, color: t.textMuted, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', pointerEvents: 'none' }}>
        {tool === 'select' && !connecting && 'Click to select  ·  Drag anchor dots to connect  ·  Scroll to zoom  ·  Space + drag to pan'}
        {tool === 'text' && 'Click to place a text node'}
        {tool === 'rect' && 'Click and drag to draw a rectangle'}
        {tool === 'ellipse' && 'Click and drag to draw an ellipse'}
        {tool === 'line' && 'Click and drag to draw a line'}
        {connecting && '🔗 Drag to a target component to connect'}
      </div>

      <div style={{ position: 'absolute', bottom: 12, right: 14, display: 'flex', alignItems: 'center', gap: 2, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
        <button onClick={() => setScale(s => Math.max(0.1, s / 1.15))} style={{ width: 28, height: 28, background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <button onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }) }} style={{ padding: '4px 9px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: t.textMuted, minWidth: 46 }}>{Math.round(scale * 100)}%</button>
        <button onClick={() => setScale(s => Math.min(3, s * 1.15))} style={{ width: 28, height: 28, background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      </div>
    </div>
  )
})

export default CanvasArea
