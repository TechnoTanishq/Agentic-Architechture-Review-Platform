package com.architectureai.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * DTO representing a full architecture review report returned to the client.
 *
 * <p>Fields mirror the {@link com.architectureai.backend.entity.ReviewReport} entity.
 * JSON-serialised sub-objects (criticalBlockers, priorityFixes, etc.) are returned
 * as plain strings so the frontend can parse them into typed objects with its own logic.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewReportResponse {

    private String id;

    private String projectId;

    // ── Scores ───────────────────────────────────────────────────────────────

    private int overallScore;

    private String grade;

    private String verdict;

    private String summary;

    // ── Summary items (each entry is a JSON string) ───────────────────────────

    private List<String> criticalBlockers;

    private List<String> priorityFixes;

    private List<String> quickWins;

    private List<String> strengths;

    private List<String> recommendedNextSteps;

    // ── Per-agent data ────────────────────────────────────────────────────────

    /** Key = agent name, value = JSON string with summary/finding_count/highest_severity. */
    private Map<String, String> perAgentSummary;

    /** Each entry is a JSON string of a full agent-findings block. */
    private List<String> agentFindings;

    // ── Pipeline metadata ─────────────────────────────────────────────────────

    private String architectureSummary;

    private List<String> riskDomains;

    /**
     * The raw review_report JSON string produced by the Python reviewer agent.
     * The frontend parses this directly for the full report UI.
     */
    private String reviewReportJson;

    // ── Timestamps ────────────────────────────────────────────────────────────

    private Instant createdAt;

    private Instant updatedAt;
}
