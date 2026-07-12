function toSnakeCase(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function detectArchType(components) {
  const types = components.map(c => c.type || '')
  if (types.includes('Cache / Queue') && types.filter(t => t === 'Compute / Compute Layer').length > 2)
    return 'Microservices'
  if (types.includes('Compute / Compute Layer') && types.includes('Database') && types.includes('Load Balancer'))
    return 'Classic 3-Tier Web App'
  if (components.some(c => c.awsId === 'aws_lambda'))
    return 'Serverless Architecture'
  if (types.includes('Network Boundary'))
    return 'VPC-based Cloud Architecture'
  return 'Custom Architecture'
}

function detectTechStack(components) {
  const stack = new Set()
  components.forEach(el => {
    if (el.awsId) stack.add('AWS')
    if (el.awsId === 'aws_lambda') stack.add('AWS Lambda')
    if (el.awsId === 'aws_rds') stack.add('Amazon RDS')
    if (el.awsId === 'aws_dynamodb') stack.add('Amazon DynamoDB')
    if (el.awsId === 'aws_s3') stack.add('Amazon S3')
    if (el.awsId === 'aws_cloudfront') stack.add('Amazon CloudFront')
    if (el.awsId === 'aws_route53') stack.add('Amazon Route 53')
    if (el.awsId === 'aws_ecs') stack.add('Amazon ECS')
    if (el.awsId === 'aws_eks') stack.add('Amazon EKS / Kubernetes')
    if (el.awsId === 'aws_sqs') stack.add('Amazon SQS')
    if (el.awsId === 'aws_elasticache') stack.add('Redis / ElastiCache')
    if (el.name) stack.add(el.name)
  })
  return [...stack].slice(0, 8)
}

function inferConnections(el, allElements) {
  const arrows = allElements.filter(e => e.kind === 'arrow' && e.points)
  const connections = []
  arrows.forEach(arrow => {
    const [x1, y1, x2, y2] = arrow.points
    const inBounds = (ex, ey, e) => {
      const px = e.x ?? 0, py = e.y ?? 0
      const pw = e.width ?? 80, ph = e.height ?? 80
      return ex >= px - 10 && ex <= px + pw + 10 && ey >= py - 10 && ey <= py + ph + 10
    }
    if (inBounds(x1, y1, el)) {
      const target = allElements.find(t =>
        t.id !== el.id && t.kind !== 'arrow' && t.kind !== 'text' && inBounds(x2, y2, t)
      )
      if (target) {
        const targetId = toSnakeCase(target.label || target.name || target.id)
        if (!connections.includes(targetId)) connections.push(targetId)
      }
    }
  })
  return connections
}

function inferEnclosedWithin(el, allElements) {
  const containers = allElements.filter(e => e.kind === 'container' && e.id !== el.id)
  for (const container of containers) {
    const px = container.x ?? 0, py = container.y ?? 0
    const pw = container.width ?? 200, ph = container.height ?? 150
    if ((el.x ?? 0) >= px && (el.x ?? 0) <= px + pw && (el.y ?? 0) >= py && (el.y ?? 0) <= py + ph) {
      return toSnakeCase(container.label || container.name || container.id)
    }
  }
  return null
}

export function parseToArchitecturalGraph(elements) {
  const componentEls = elements.filter(el =>
    el.kind === 'component' || el.kind === 'container' ||
    (el.kind === 'shape' && el.label) || (el.kind === 'text' && el.text)
  )

  const components = componentEls.map(el => {
    const rawId = el.label || el.name || el.id
    const id = toSnakeCase(rawId)
    const connections = inferConnections(el, elements)
    const enclosed_within = el.kind !== 'container' ? inferEnclosedWithin(el, elements) : null
    return {
      id,
      name: el.label || el.name || el.text || id,
      type: el.type || (el.kind === 'container' ? 'Network Boundary' : 'Generic Backend / Workload'),
      technology: el.awsId ? (el.name || null) : null,
      is_cloud_managed: el.awsId ? el.awsId.startsWith('aws_') : false,
      enclosed_within,
      connections,
      _canvas: {
        kind: el.kind,
        emoji: el.emoji || null,
        description: el.description || null,
        position: { x: Math.round(el.x || 0), y: Math.round(el.y || 0) },
        size: { width: Math.round(el.width || 0), height: Math.round(el.height || 0) },
      }
    }
  })

  const anomalies = []
  const unlabeled = elements.filter(e => (e.kind === 'component' || e.kind === 'shape') && !e.label && !e.name)
  if (unlabeled.length > 0) anomalies.push(`${unlabeled.length} unlabeled element(s) found.`)
  const isolated = components.filter(c => c.connections.length === 0 && c.enclosed_within === null && c.type !== 'Network Boundary')
  if (isolated.length > 0) anomalies.push(`${isolated.length} isolated node(s) with no connections: ${isolated.map(n => n.name).join(', ')}`)

  return {
    detected_architecture_type: detectArchType(components),
    primary_tech_stack: detectTechStack(componentEls),
    components,
    visual_anomalies_or_notes: anomalies,
  }
}
