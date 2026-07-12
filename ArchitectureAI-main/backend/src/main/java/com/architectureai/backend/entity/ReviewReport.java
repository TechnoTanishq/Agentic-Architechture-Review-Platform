package com.architectureai.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Entity representing the final review report for a project's architecture review.
 *
 * <p>Only one report exists per project. Fields map directly to the output schema
 * produced by the Python reviewer_agent via the ArchEval FastAPI service.</p>
 */
@Document(collection = "review_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewReport {

    @Id
    private String id;

    /** Foreign key — one report per project. */
    @Indexed(unique = true)
    private String projectId;

    // ─── Scores ──────────────────────────────────────────────────────────────

    /** Numeric score 0–100. */
    private int overallScore;

    /** Letter grade A–F. */
    private String grade;

    /** One-sentence verdict naming specific components and their primary risk. */
    private String verdict;

    // ─── Summary items ────────────────────────────────────────────────────────

    /**
     * High-level summary text (kept for backwards compatibility and quick display).
     */
    private String summary;

    /**
     * Critical blockers. Each entry is a JSON-serialised object:
     * {@code { "issue": "...", "agent": "...", "why": "..." }}.
     * Stored as raw strings so we don't need embedded document classes.
     */
    private List<String> criticalBlockers;

    /**
     * Ordered priority fixes. Each entry is a JSON-serialised object:
     * {@code { "priority": 1, "issue": "...", "agent": "...", "fix": "...", "estimated_effort": "..." }}.
     */
    private List<String> priorityFixes;

    /**
     * Quick wins: low-effort, high-value actions. Each entry is JSON:
     * {@code { "action": "...", "benefit": "..." }}.
     */
    private List<String> quickWins;

    /** Specific strengths referencing actual component names from the diagram. */
    private List<String> strengths;

    /**
     * Recommended sprint-level next steps, e.g. "Sprint 1: enable MFA on all IAM users".
     */
    private List<String> recommendedNextSteps;

    // ─── Per-agent data ───────────────────────────────────────────────────────

    /**
     * Per-agent summary map. Key = agent name (e.g. "security_agent"),
     * value = JSON string {@code { "summary": "...", "finding_count": N, "highest_severity": "..." }}.
     */
    private Map<String, String> perAgentSummary;

    /**
     * Full agent findings list. Each entry is a JSON-serialised agent block:
     * {@code { "agent": "...", "summary": "...", "findings": [...] }}.
     */
    private List<String> agentFindings;

    // ─── Pipeline metadata ────────────────────────────────────────────────────

    /** Human-readable architecture summary produced by the deterministic pre-analysis stage. */
    private String architectureSummary;

    /** Risk domains identified by the planner (e.g. ["security", "cost", "reliability"]). */
    private List<String> riskDomains;

    /**
     * The raw review_report JSON string as returned by the reviewer agent.
     * The frontend parses this directly for rendering the full report UI.
     */
    private String reviewReportJson;

    // ─── Timestamps ───────────────────────────────────────────────────────────

    private Instant createdAt;

    private Instant updatedAt;
}
