package com.architectureai.backend.controller;

import com.architectureai.backend.dto.CreateProjectRequest;
import com.architectureai.backend.dto.ProjectResponse;
import com.architectureai.backend.dto.UpdateProjectRequest;
import com.architectureai.backend.entity.ProjectStatus;
import com.architectureai.backend.security.CustomUserDetails;
import com.architectureai.backend.service.CloudinaryService;
import com.architectureai.backend.service.ProjectService;
import com.architectureai.backend.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * REST controller exposing project management endpoints.
 *
 * <p>All endpoints require a valid JWT token. Ownership verification is performed
 * inside {@link ProjectService} — users may only operate on projects referenced
 * in their own {@code projectIds} list.</p>
 *
 * <h3>Upload + auto-review</h3>
 * <p>{@code POST /projects/{id}/upload} uploads the diagram to Cloudinary and immediately
 * fires the async AI review pipeline. The response returns the updated project with
 * status {@code REVIEWING} while the pipeline runs in the background. Poll
 * {@code GET /projects/{id}} until status is {@code COMPLETED}, then call
 * {@code GET /projects/{id}/report} for the full report.</p>
 */
@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final CloudinaryService cloudinaryService;
    private final ReviewService reviewService;

    public ProjectController(
            ProjectService projectService,
            CloudinaryService cloudinaryService,
            ReviewService reviewService) {
        this.projectService = projectService;
        this.cloudinaryService = cloudinaryService;
        this.reviewService = reviewService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CRUD
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Create a new project for the authenticated user.
     *
     * @param request     the project creation payload
     * @param userDetails the currently authenticated user
     * @return the created project with HTTP 201
     */
    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(
            @Valid @RequestBody CreateProjectRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ProjectResponse response = projectService.createProject(request, userDetails);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Retrieve all projects belonging to the authenticated user.
     *
     * @param userDetails the currently authenticated user
     * @return list of the user's projects with HTTP 200
     */
    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getAllProjects(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<ProjectResponse> responses = projectService.getAllProjects(userDetails);
        return ResponseEntity.ok(responses);
    }

    /**
     * Retrieve a single project by ID, verifying ownership.
     *
     * @param projectId   the ID of the project to retrieve
     * @param userDetails the currently authenticated user
     * @return the project with HTTP 200
     */
    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> getProject(
            @PathVariable String projectId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ProjectResponse response = projectService.getProject(projectId, userDetails);
        return ResponseEntity.ok(response);
    }

    /**
     * Update an existing project's name and description, verifying ownership.
     *
     * @param projectId   the ID of the project to update
     * @param request     the update payload
     * @param userDetails the currently authenticated user
     * @return the updated project with HTTP 200
     */
    @PutMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> updateProject(
            @PathVariable String projectId,
            @Valid @RequestBody UpdateProjectRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ProjectResponse response = projectService.updateProject(projectId, request, userDetails);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete a project, verifying ownership.
     *
     * @param projectId   the ID of the project to delete
     * @param userDetails the currently authenticated user
     * @return HTTP 204 No Content
     */
    @DeleteMapping("/{projectId}")
    public ResponseEntity<Void> deleteProject(
            @PathVariable String projectId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        projectService.deleteProject(projectId, userDetails);
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Upload + auto-review
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Upload an architecture diagram and automatically start the AI review pipeline.
     *
     * <ol>
     *   <li>Verify project ownership.</li>
     *   <li>Upload the image to Cloudinary and persist the URL.</li>
     *   <li>Set project status to {@code REVIEWING}.</li>
     *   <li>Fire the async AI pipeline ({@link ReviewService#triggerReview}).</li>
     * </ol>
     *
     * <p>The endpoint returns immediately (HTTP 200) with the project in
     * {@code REVIEWING} state. Poll {@code GET /projects/{projectId}} for status updates.
     * When status is {@code COMPLETED}, fetch the full report via
     * {@code GET /projects/{projectId}/report}.</p>
     *
     * @param projectId   the ID of the project
     * @param file        the architecture diagram image (JPG, PNG, WEBP, etc.)
     * @param userDetails the currently authenticated user
     * @return the updated project response DTO with HTTP 200
     */
    @PostMapping("/{projectId}/upload")
    public ResponseEntity<ProjectResponse> uploadDiagram(
            @PathVariable String projectId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        // 1. Verify ownership before any side effects
        projectService.verifyProjectOwnership(projectId, userDetails);

        // 2. Upload to Cloudinary
        @SuppressWarnings("rawtypes")
        Map uploadResult = cloudinaryService.uploadImage(file);
        String diagramUrl        = (String) uploadResult.get("url");
        String cloudinaryPublicId = (String) uploadResult.get("public_id");

        // 3. Persist diagram URL and set status → REVIEWING
        ProjectResponse response = projectService.updateProjectDiagram(
                projectId,
                diagramUrl,
                cloudinaryPublicId,
                ProjectStatus.REVIEWING,
                userDetails);

        // 4. Kick off the async AI review pipeline (returns immediately)
        reviewService.triggerReview(projectId, userDetails);

        return ResponseEntity.ok(response);
    }
}
