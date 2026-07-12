package com.architectureai.backend.service;

import com.architectureai.backend.dto.ReviewReportResponse;
import com.architectureai.backend.entity.AgentOutput;
import com.architectureai.backend.entity.Project;
import com.architectureai.backend.entity.ProjectStatus;
import com.architectureai.backend.entity.ReviewReport;
import com.architectureai.backend.exception.ProjectNotFoundException;
import com.architectureai.backend.repository.AgentOutputRepository;
import com.architectureai.backend.repository.ProjectRepository;
import com.architectureai.backend.repository.ReviewReportRepository;
import com.architectureai.backend.security.CustomUserDetails;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Orchestrates the full AI review pipeline for an uploaded architecture diagram.
 *
 * <h3>Flow</h3>
 * <ol>
 *   <li>Fetch the project and verify ownership.</li>
 *   <li>Set status → {@code REVIEWING}.</li>
 *   <li>Call {@link AiReviewService#parseImage} to extract the architectural graph.</li>
 *   <li>Call {@link AiReviewService#runReview} to run all 5 specialist agents.</li>
 *   <li>Persist a {@link ReviewReport} + individual {@link AgentOutput} documents.</li>
 *   <li>Set status → {@code COMPLETED} (or {@code FAILED} on error).</li>
 * </ol>
 *
 * <p>The heavy work runs on a virtual-thread executor via {@code @Async} so the HTTP
 * request that triggered the review returns immediately.</p>
 */
@Service
@Slf4j
public class ReviewService {

    private final ProjectRepository projectRepository;
    private final ReviewReportRepository reviewReportRepository;
    private final AgentOutputRepository agentOutputRepository;
    private final AiReviewService aiReviewService;
    private final ProjectService projectService;
    private final ObjectMapper objectMapper;

    public ReviewService(
            ProjectRepository projectRepository,
            ReviewReportRepository reviewReportRepository,
            AgentOutputRepository agentOutputRepository,
            AiReviewService aiReviewService,
            ProjectService projectService,
            ObjectMapper objectMapper) {
        this.projectRepository = projectRepository;
        this.reviewReportRepository = reviewReportRepository;
        this.agentOutputRepository = agentOutputRepository;
        this.aiReviewService = aiReviewService;
        this.projectService = projectService;
        this.objectMapper = objectMapper;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Trigger (async)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Kick off the review pipeline asynchronously.
     *
     * <p>Sets the project to {@code REVIEWING} before returning, so the caller
     * immediately sees an updated status while the pipeline runs in the background.</p>
     *
     * @param projectId   ID of the project to review
     * @param userDetails authenticated user (for ownership check)
     */
    @Async
    public void triggerReview(String projectId, CustomUserDetails userDetails) {
        log.info("[ReviewService] Starting async review for project '{}'", projectId);

        // 1. Ownership check
        projectService.verifyProjectOwnership(projectId, userDetails);

        // 2. Load project and get diagram URL
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found: " + projectId));

        String diagramUrl = project.getDiagramUrl();
        if (diagramUrl == null || diagramUrl.isBlank()) {
            log.error("[ReviewService] Project '{}' has no diagram URL — cannot review", projectId);
            setProjectStatus(project, ProjectStatus.FAILED);
            return;
        }

        // 3. Mark as REVIEWING
        setProjectStatus(project, ProjectStatus.REVIEWING);

        try {
            // 4. Parse image → ArchitecturalGraph
            log.info("[ReviewService] Parsing diagram image for project '{}'", projectId);
            JsonNode parsedGraph = aiReviewService.parseImage(diagramUrl);

            // 5. Run multi-agent review
            log.info("[ReviewService] Running agent review for project '{}'", projectId);
            JsonNode reviewResult = aiReviewService.runReview(parsedGraph);

            // 6. Persist results
            persistResults(projectId, parsedGraph, reviewResult);

            // 7. Mark as COMPLETED
            setProjectStatus(project, ProjectStatus.COMPLETED);
            log.info("[ReviewService] Review completed for project '{}'", projectId);

        } catch (Exception e) {
            log.error("[ReviewService] Review failed for project '{}': {}", projectId, e.getMessage(), e);
            // Re-fetch to avoid stale object
            projectRepository.findById(projectId).ifPresent(p -> setProjectStatus(p, ProjectStatus.FAILED));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fetch report
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Return the stored review report for a project.
     *
     * @param projectId   ID of the project
     * @param userDetails authenticated user (for ownership check)
     * @return the review report DTO
     */
    public ReviewReportResponse getReport(String projectId, CustomUserDetails userDetails) {
        projectService.verifyProjectOwnership(projectId, userDetails);

        ReviewReport report = reviewReportRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(
                        "No review report found for project: " + projectId));

        return toResponse(report);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Persist the {@link ReviewReport} summary and individual {@link AgentOutput} documents.
     *
     * <p>The Python pipeline returns:
     * <pre>
     * {
     *   "thread_id": "...",
     *   "architecture_summary": "...",
     *   "risk_domains": [...],
     *   "plan": {...},
     *   "agent_findings": [ { "agent": "...", "summary": "...", "findings": [...] }, ... ],
     *   "review_report": "{ JSON string of final scored report }"
     * }
     * </pre>
     * The {@code review_report} field is itself a JSON string produced by the reviewer agent.</p>
     */
    private void persistResults(String projectId, JsonNode parsedGraph, JsonNode reviewResult) {
        Instant now = Instant.now();

        // ── Parse review_report inner JSON ──────────────────────────────────
        String reviewReportJson = nodeText(reviewResult, "review_report");
        JsonNode reportNode = tryParseJson(reviewReportJson);

        // ── Build per-agent summary map ─────────────────────────────────────
        Map<String, String> perAgentSummary = new HashMap<>();
        if (reportNode != null && reportNode.has("per_agent_summary")) {
            reportNode.get("per_agent_summary").fields().forEachRemaining(entry -> {
                try {
                    perAgentSummary.put(entry.getKey(), objectMapper.writeValueAsString(entry.getValue()));
                } catch (JsonProcessingException e) {
                    perAgentSummary.put(entry.getKey(), entry.getValue().asText());
                }
            });
        }

        // ── Collect agent findings as JSON strings ──────────────────────────
        List<String> agentFindingStrings = new ArrayList<>();
        JsonNode agentFindingsNode = reviewResult.path("agent_findings");
        if (agentFindingsNode.isArray()) {
            agentFindingsNode.forEach(af -> {
                try {
                    agentFindingStrings.add(objectMapper.writeValueAsString(af));
                } catch (JsonProcessingException e) {
                    agentFindingStrings.add(af.toString());
                }
            });
        }

        // ── Risk domains ────────────────────────────────────────────────────
        List<String> riskDomains = new ArrayList<>();
        JsonNode domainsNode = reviewResult.path("risk_domains");
        if (domainsNode.isArray()) {
            domainsNode.forEach(d -> riskDomains.add(d.asText()));
        }

        // ── Scalar fields from reviewer_agent report ────────────────────────
        int overallScore    = reportNode != null ? reportNode.path("overall_score").asInt(0) : 0;
        String grade        = reportNode != null ? nodeText(reportNode, "grade")   : "";
        String verdict      = reportNode != null ? nodeText(reportNode, "verdict") : "";
        String summary      = nodeText(reviewResult, "architecture_summary");

        // ── List fields (each item serialised as JSON string) ───────────────
        List<String> criticalBlockers     = jsonArrayToStringList(reportNode, "critical_blockers");
        List<String> priorityFixes        = jsonArrayToStringList(reportNode, "priority_fixes");
        List<String> quickWins            = jsonArrayToStringList(reportNode, "quick_wins");
        List<String> strengths            = jsonArrayToStringList(reportNode, "strengths");
        List<String> recommendedNextSteps = jsonArrayToStringList(reportNode, "recommended_next_steps");

        // ── Upsert ReviewReport ─────────────────────────────────────────────
        ReviewReport report = reviewReportRepository.findByProjectId(projectId)
                .orElse(ReviewReport.builder().projectId(projectId).createdAt(now).build());

        report.setOverallScore(overallScore);
        report.setGrade(grade);
        report.setVerdict(verdict);
        report.setSummary(summary);
        report.setCriticalBlockers(criticalBlockers);
        report.setPriorityFixes(priorityFixes);
        report.setQuickWins(quickWins);
        report.setStrengths(strengths);
        report.setRecommendedNextSteps(recommendedNextSteps);
        report.setPerAgentSummary(perAgentSummary);
        report.setAgentFindings(agentFindingStrings);
        report.setArchitectureSummary(summary);
        report.setRiskDomains(riskDomains);
        report.setReviewReportJson(reviewReportJson);
        report.setUpdatedAt(now);

        reviewReportRepository.save(report);
        log.info("[ReviewService] Saved ReviewReport for project '{}' (score: {}/100)", projectId, overallScore);

        // ── Persist individual AgentOutputs ─────────────────────────────────
        // Delete stale outputs from a previous run first
        agentOutputRepository.deleteAll(agentOutputRepository.findAllByProjectId(projectId));

        if (agentFindingsNode.isArray()) {
            agentFindingsNode.forEach(af -> {
                String agentName = af.path("agent").asText("unknown_agent");
                try {
                    AgentOutput ao = AgentOutput.builder()
                            .projectId(projectId)
                            .agentName(agentName)
                            .output(objectMapper.writeValueAsString(af))
                            .createdAt(now)
                            .build();
                    agentOutputRepository.save(ao);
                } catch (JsonProcessingException e) {
                    log.warn("[ReviewService] Could not serialise agent output for '{}': {}", agentName, e.getMessage());
                }
            });
        }
        log.info("[ReviewService] Persisted {} AgentOutput documents for project '{}'",
                agentFindingStrings.size(), projectId);
    }

    private void setProjectStatus(Project project, ProjectStatus status) {
        project.setStatus(status);
        project.setUpdatedAt(Instant.now());
        projectRepository.save(project);
    }

    /** Read a text field from a JsonNode, returning empty string if absent. */
    private String nodeText(JsonNode node, String fieldName) {
        if (node == null) return "";
        JsonNode field = node.path(fieldName);
        return field.isMissingNode() ? "" : field.asText("");
    }

    /** Silently try to parse a JSON string; return null on failure. */
    private JsonNode tryParseJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            log.warn("[ReviewService] Could not parse inner review_report JSON: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Convert a JSON array inside {@code parent} into a list of JSON strings.
     * Each array element is serialised back to a compact JSON string so the
     * ReviewReport entity can store it as a {@code List<String>}.
     */
    private List<String> jsonArrayToStringList(JsonNode parent, String fieldName) {
        List<String> result = new ArrayList<>();
        if (parent == null) return result;
        JsonNode array = parent.path(fieldName);
        if (!array.isArray()) return result;
        array.forEach(item -> {
            try {
                // Strings are stored as-is; objects are re-serialised to compact JSON
                result.add(item.isTextual() ? item.asText() : objectMapper.writeValueAsString(item));
            } catch (JsonProcessingException e) {
                result.add(item.toString());
            }
        });
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DTO mapper
    // ─────────────────────────────────────────────────────────────────────────

    private ReviewReportResponse toResponse(ReviewReport r) {
        return ReviewReportResponse.builder()
                .id(r.getId())
                .projectId(r.getProjectId())
                .overallScore(r.getOverallScore())
                .grade(r.getGrade())
                .verdict(r.getVerdict())
                .summary(r.getSummary())
                .criticalBlockers(r.getCriticalBlockers())
                .priorityFixes(r.getPriorityFixes())
                .quickWins(r.getQuickWins())
                .strengths(r.getStrengths())
                .recommendedNextSteps(r.getRecommendedNextSteps())
                .perAgentSummary(r.getPerAgentSummary())
                .agentFindings(r.getAgentFindings())
                .architectureSummary(r.getArchitectureSummary())
                .riskDomains(r.getRiskDomains())
                .reviewReportJson(r.getReviewReportJson())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
