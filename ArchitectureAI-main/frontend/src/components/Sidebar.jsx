import { useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import { useTheme } from '../App.jsx'

const AWS_COMPONENTS = [
  { id: 'aws_s3',         name: 'S3',           type: 'Storage',                    color: '#E8501A', emoji: '🪣', desc: 'Simple Storage Service' },
  { id: 'aws_ec2',        name: 'EC2',          type: 'Compute / Compute Layer',    color: '#E8501A', emoji: '🖥', desc: 'Elastic Compute Cloud' },
  { id: 'aws_lambda',     name: 'Lambda',       type: 'Compute / Compute Layer',    color: '#E8501A', emoji: 'λ',  desc: 'Serverless Functions' },
  { id: 'aws_rds',        name: 'RDS',          type: 'Database',                   color: '#3B48CC', emoji: '🗄', desc: 'Relational Database Service' },
  { id: 'aws_dynamodb',   name: 'DynamoDB',     type: 'Database',                   color: '#3B48CC', emoji: '⚡', desc: 'NoSQL Database' },
  { id: 'aws_elb',        name: 'Load Balancer',type: 'Load Balancer',              color: '#E8501A', emoji: '⚖', desc: 'Elastic Load Balancing' },
  { id: 'aws_cloudfront', name: 'CloudFront',   type: 'DNS / Routing',              color: '#E8501A', emoji: '🌐', desc: 'CDN Service' },
  { id: 'aws_route53',    name: 'Route 53',     type: 'DNS / Routing',              color: '#E8501A', emoji: '🔀', desc: 'DNS Web Service' },
  { id: 'aws_sqs',        name: 'SQS',          type: 'Cache / Queue',              color: '#E8501A', emoji: '📨', desc: 'Simple Queue Service' },
  { id: 'aws_sns',        name: 'SNS',          type: 'Cache / Queue',              color: '#E8501A', emoji: '📢', desc: 'Simple Notification Service' },
  { id: 'aws_elasticache',name: 'ElastiCache',  type: 'Cache / Queue',              color: '#E8501A', emoji: '⚡', desc: 'In-memory Cache' },
  { id: 'aws_cognito',    name: 'Cognito',      type: 'Generic Backend / Workload', color: '#E8501A', emoji: '🔐', desc: 'User Authentication' },
  { id: 'aws_apigateway', name: 'API Gateway',  type: 'Generic Backend / Workload', color: '#E8501A', emoji: '🔌', desc: 'API Management' },
  { id: 'aws_cloudwatch', name: 'CloudWatch',   type: 'Management / Governance',    color: '#E8501A', emoji: '📊', desc: 'Monitoring & Logging' },
  { id: 'aws_iam',        name: 'IAM',          type: 'Management / Governance',    color: '#E8501A', emoji: '🔑', desc: 'Identity & Access Mgmt' },
  { id: 'aws_vpc',        name: 'VPC',          type: 'Network Boundary',           color: '#2E7D32', emoji: '🔒', desc: 'Virtual Private Cloud', isContainer: true },
  { id: 'aws_ecs',        name: 'ECS',          type: 'Compute / Compute Layer',    color: '#E8501A', emoji: '🐳', desc: 'Container Service' },
  { id: 'aws_eks',        name: 'EKS',          type: 'Compute / Compute Layer',    color: '#E8501A', emoji: '☸', desc: 'Kubernetes Service' },
  { id: 'aws_appsync',    name: 'AppSync',      type: 'Generic Backend / Workload', color: '#E8501A', emoji: '🔗', desc: 'GraphQL Service' },
  { id: 'aws_kinesis',    name: 'Kinesis',      type: 'Cache / Queue',              color: '#E8501A', emoji: '🌊', desc: 'Data Streaming' },
]

const GENERAL_COMPONENTS = [
  { id: 'gen_server',      name: 'Server',       type: 'Compute / Compute Layer',    color: '#546E7A', emoji: '🖥', desc: 'Generic Server' },
  { id: 'gen_database',    name: 'Database',     type: 'Database',                   color: '#546E7A', emoji: '🗄', desc: 'Generic Database' },
  { id: 'gen_client',      name: 'Client',       type: 'Frontend / Client',          color: '#546E7A', emoji: '💻', desc: 'Client Application' },
  { id: 'gen_mobile',      name: 'Mobile App',   type: 'Frontend / Client',          color: '#546E7A', emoji: '📱', desc: 'Mobile App' },
  { id: 'gen_browser',     name: 'Browser',      type: 'Frontend / Client',          color: '#546E7A', emoji: '🌐', desc: 'Web Browser' },
  { id: 'gen_api',         name: 'API',          type: 'Generic Backend / Workload', color: '#546E7A', emoji: '🔌', desc: 'API Endpoint' },
  { id: 'gen_cache',       name: 'Cache',        type: 'Cache / Queue',              color: '#546E7A', emoji: '⚡', desc: 'Cache Layer' },
  { id: 'gen_queue',       name: 'Queue',        type: 'Cache / Queue',              color: '#546E7A', emoji: '📨', desc: 'Message Queue' },
  { id: 'gen_microservice',name: 'Microservice', type: 'Generic Backend / Workload', color: '#546E7A', emoji: '⚙', desc: 'Microservice' },
  { id: 'gen_firewall',    name: 'Firewall',     type: 'Network Boundary',           color: '#546E7A', emoji: '🛡', desc: 'Firewall / WAF' },
  { id: 'gen_user',        name: 'User',         type: 'Frontend / Client',          color: '#546E7A', emoji: '👤', desc: 'End User' },
  { id: 'gen_internet',    name: 'Internet',     type: 'Network Boundary',           color: '#546E7A', emoji: '🌍', desc: 'Internet / WWW' },
]

const SHAPE_COMPONENTS = [
  { id: 'shape_rect',    name: 'Rectangle',   shape: 'rect',    color: '#5b6af0', emoji: '▭' },
  { id: 'shape_rounded', name: 'Rounded Box', shape: 'rounded', color: '#5b6af0', emoji: '▢' },
  { id: 'shape_ellipse', name: 'Ellipse',     shape: 'ellipse', color: '#5b6af0', emoji: '⬭' },
  { id: 'shape_diamond', name: 'Diamond',     shape: 'diamond', color: '#5b6af0', emoji: '◇' },
  { id: 'shape_group',   name: 'Group / Zone',shape: 'group',   color: '#2E7D32', emoji: '⬜', isContainer: true },
]

export default function Sidebar({ onAddElement }) {
  const t = useTheme()
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState({ shapes: true })
  const toggle = (key) => setCollapsed(c => ({ ...c, [key]: !c[key] }))
  const filter = (items) => query ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) || (i.desc || '').toLowerCase().includes(query.toLowerCase())) : items
  const handleDragStart = (e, item) => { e.dataTransfer.setData('application/archcanvas', JSON.stringify(item)); e.dataTransfer.effectAllowed = 'copy' }
  const handleClick = (item) => { const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; onAddElement(buildElement(id, item)) }

  return (
    <aside style={{ width: 208, flexShrink: 0, background: t.surface, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '10px 10px 8px', borderBottom: `1px solid ${t.border}` }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 7 }}>Components</p>
        <div style={{ position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: t.textFaint, pointerEvents: 'none' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search components…"
            style={{ width: '100%', padding: '6px 8px 6px 28px', background: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 7, color: t.text, fontSize: 12, outline: 'none' }}
            onFocus={e => e.target.style.borderColor = t.accent} onBlur={e => e.target.style.borderColor = t.border} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 8px' }}>
        <Section title="AWS Services" items={filter(AWS_COMPONENTS)} collapsed={collapsed['aws']} onToggle={() => toggle('aws')} onAdd={handleClick} onDragStart={handleDragStart} t={t} />
        <Section title="General" items={filter(GENERAL_COMPONENTS)} collapsed={collapsed['gen']} onToggle={() => toggle('gen')} onAdd={handleClick} onDragStart={handleDragStart} t={t} />
        <Section title="Shapes" items={filter(SHAPE_COMPONENTS)} collapsed={collapsed['shapes']} onToggle={() => toggle('shapes')} onAdd={handleClick} onDragStart={handleDragStart} t={t} />
      </div>
    </aside>
  )
}

function Section({ title, items, collapsed, onToggle, onAdd, onDragStart, t }) {
  return (
    <div>
      <button onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', padding: '7px 10px 5px', background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
        {title}
        <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: 0.6 }}>{items.length}</span>
      </button>
      {!collapsed && items.map(item => <SidebarItem key={item.id} item={item} t={t} onClick={() => onAdd(item)} onDragStart={e => onDragStart(e, item)} />)}
    </div>
  )
}

function SidebarItem({ item, onClick, onDragStart, t }) {
  const [hov, setHov] = useState(false)
  return (
    <div draggable onDragStart={onDragStart} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} title={item.desc || item.name}
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 10px', cursor: 'grab', background: hov ? t.surfaceHover : 'transparent', transition: 'background 0.1s' }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: (item.color || '#5b6af0') + '18', border: `1.5px solid ${item.color || '#5b6af0'}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
        {item.emoji}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, color: t.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{item.name}</p>
        {item.desc && <p style={{ fontSize: 10, color: t.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{item.desc}</p>}
      </div>
    </div>
  )
}

export function buildElement(id, item) {
  const base = { id, label: item.name, fontSize: 12, fontStyle: 'normal', textColor: null, opacity: 1 }
  if (item.shape !== undefined) {
    return { ...base, kind: 'shape', shape: item.shape, x: 340 + Math.random() * 40, y: 220 + Math.random() * 40, width: 130, height: 75, fill: null, stroke: item.color || '#5b6af0', strokeWidth: 1.5, isContainer: !!item.isContainer }
  }
  if (item.isContainer) {
    return { ...base, kind: 'container', awsId: item.id, name: item.name, type: item.type, x: 300 + Math.random() * 40, y: 200 + Math.random() * 40, width: 240, height: 150, emoji: item.emoji, color: item.color, fill: null, stroke: item.color }
  }
  return { ...base, kind: 'component', awsId: item.id, name: item.name, type: item.type, x: 320 + Math.random() * 80, y: 200 + Math.random() * 80, width: 96, height: 84, emoji: item.emoji, color: item.color, description: item.desc || '', fill: null, stroke: item.color }
}
