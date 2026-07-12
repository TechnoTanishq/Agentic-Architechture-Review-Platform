# AI Review Agents

The platform uses multiple independent AI agents.

Each agent analyzes the uploaded architecture from a different perspective.

All agents execute concurrently using Java 21 Virtual Threads.

---

## Architecture Review Agent

Evaluates:

- Overall design
- Scalability
- Service interactions
- Design patterns

---

## Security Agent

Evaluates:

- IAM
- Encryption
- Network Security
- Secrets Management
- Least Privilege

---

## Cost Optimization Agent

Evaluates:

- AWS Pricing
- Overprovisioned Resources
- Reserved Instances
- Storage Optimization

---

## Performance Agent

Evaluates:

- Latency
- Throughput
- Caching
- Load Balancing

---

## Reliability Agent

Evaluates:

- Fault Tolerance
- High Availability
- Disaster Recovery
- Backup Strategy

---

## AWS Best Practices Agent

Evaluates:

- AWS Well-Architected Framework
- Operational Excellence
- Security
- Reliability
- Performance Efficiency
- Cost Optimization
- Sustainability

---

The orchestrator waits for all agents to complete and combines the results into a single optimization report.