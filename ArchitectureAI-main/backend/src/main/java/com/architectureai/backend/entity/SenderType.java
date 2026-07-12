package com.architectureai.backend.entity;

/**
 * Represents the type of sender for chat messages in a project review.
 */
public enum SenderType {
    /**
     * The authenticated user.
     */
    USER,

    /**
     * The backend/orchestrator system messages.
     */
    SYSTEM,

    /**
     * Specialist Security Review Agent.
     */
    SECURITY_AGENT,

    /**
     * Specialist Scalability/Performance Review Agent.
     */
    SCALABILITY_AGENT,

    /**
     * Specialist Cost Optimization Agent.
     */
    COST_AGENT,

    /**
     * Specialist Reliability Agent.
     */
    RELIABILITY_AGENT,

    /**
     * Specialist AWS Best Practices / Compliance Agent.
     */
    COMPLIANCE_AGENT,

    /**
     * Combined/Reviewer Orchestrator Agent.
     */
    REVIEWER_AGENT
}
