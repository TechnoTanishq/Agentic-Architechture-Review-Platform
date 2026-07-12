package com.architectureai.backend.controller;

import com.architectureai.backend.dto.ReviewReportResponse;
import com.architectureai.backend.dto.TriggerReviewResponse;
import com.architectureai.backend.entity.ProjectStatus;
import com.architectureai.backend.security.CustomUserDetails;
import com.architectureai.backend.service.ProjectService;
import com.architectureai.backend.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for triggering and retrieving AI architecture reviews.
 *
 * <h3>Endpoints</h3>
 * <ul>
 *   <li>{@code POST /projects/{projectId}/review} — kick off the async AI pipeline</li>
 *   <li>{@code GET  /projects/{projectId}/report} — fetch the stored review report</li>
 * </ul>
 *
 * <p>Both endpoints require a valid JWT. Ownership is verified inside the service layer.</p>
 */
@RestController
@RequestMapping("/projects/{projectId}")
public class ReviewController {

    private final ReviewService reviewService;
    private final ProjectService projectService;

    public ReviewController(ReviewService reviewService, ProjectService projectService) {
        this.reviewService = reviewService;
        this.projectService = projectService;
    }

    /**
     * Trigger the AI review pipeline for a project.
     *
     * <p>The pipeline runs asynchronously. The endpoint returns immediately with
     * {@code 202 Accepted} and a status of {@code REVIEWING}. Poll
     * {@code GET /projects/{projectId}} to watch for {@code COMPLETED} or {@code FAILED}.</p>
     *
     * @param projectId   the ID of the project to review
     * @param userDetails the currently authenticated user
     * @return 202 with a {@link TriggerReviewResponse} containing the new status
     */
    @PostMapping("/review")
    public ResponseEntity<TriggerReviewResponse> triggerReview(
            @PathVariable String projectId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        // Verify ownership before dispatching async work
        projectService.verifyProjectOwnership(projectId, userDetails);

        // Fire-and-forget — runs on virtual-thread async executor
        reviewService.triggerReview(projectId, userDetails);

        return ResponseEntity.accepted().body(
                TriggerReviewResponse.builder()
                        .projectId(projectId)
                        .message("Review started. Poll GET /projects/" + projectId + " for status updates.")
                        .status(ProjectStatus.REVIEWING.name())
                        .build());
    }

    /**
     * Retrieve the completed review report for a project.
     *
     * <p>Returns {@code 404} if the project does not yet have a report
     * (i.e. the review has not completed).</p>
     *
     * @param projectId   the ID of the project
     * @param userDetails the currently authenticated user
     * @return 200 with the full {@link ReviewReportResponse}
     */
    @GetMapping("/report")
    public ResponseEntity<ReviewReportResponse> getReport(
            @PathVariable String projectId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        ReviewReportResponse report = reviewService.getReport(projectId, userDetails);
        return ResponseEntity.ok(report);
    }
}
