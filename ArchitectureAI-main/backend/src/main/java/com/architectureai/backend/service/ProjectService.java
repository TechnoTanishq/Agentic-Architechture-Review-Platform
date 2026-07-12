package com.architectureai.backend.service;

import com.architectureai.backend.dto.CreateProjectRequest;
import com.architectureai.backend.dto.ProjectResponse;
import com.architectureai.backend.dto.UpdateProjectRequest;
import com.architectureai.backend.entity.Project;
import com.architectureai.backend.entity.ProjectStatus;
import com.architectureai.backend.entity.User;
import com.architectureai.backend.exception.ProjectAccessDeniedException;
import com.architectureai.backend.exception.ProjectNotFoundException;
import com.architectureai.backend.repository.ProjectRepository;
import com.architectureai.backend.repository.UserRepository;
import com.architectureai.backend.security.CustomUserDetails;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

/**
 * Service providing business logic for project management.
 *
 * <p>Ownership is enforced via {@link User#getProjectIds()}: no userId is stored
 * on the {@link Project} document. Every operation that touches a project first
 * verifies that the project ID exists in the authenticated user's projectIds list.</p>
 */
@Service
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    /**
     * Constructs a new {@code ProjectService} using constructor injection.
     *
     * @param projectRepository repository for project documents
     * @param userRepository    repository for user documents
     */
    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Create a new project and add its ID to the authenticated user's projectIds.
     *
     * <ol>
     *   <li>Build and save the Project document.</li>
     *   <li>Append the generated project ID to User.projectIds.</li>
     *   <li>Save the updated User document.</li>
     * </ol>
     *
     * @param request     the project creation payload
     * @param userDetails the currently authenticated user
     * @return the created project as a {@link ProjectResponse}
     */
    public ProjectResponse createProject(CreateProjectRequest request, CustomUserDetails userDetails) {
        Instant now = Instant.now();

        Project project = Project.builder()
                .projectName(request.getProjectName())
                .description(request.getDescription())
                .status(ProjectStatus.UPLOADING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Project saved = projectRepository.save(project);
        log.info("Created project '{}' with id '{}'", saved.getProjectName(), saved.getId());

        // Ownership: add the project ID to the user's projectIds list
        User user = resolveUser(userDetails);
        user.getProjectIds().add(saved.getId());
        userRepository.save(user);
        log.info("Added project '{}' to user '{}'", saved.getId(), user.getUsername());

        return toResponse(saved);
    }

    // -------------------------------------------------------------------------
    // Read — single
    // -------------------------------------------------------------------------

    /**
     * Retrieve a single project by ID after verifying ownership.
     *
     * @param projectId   the project ID to retrieve
     * @param userDetails the currently authenticated user
     * @return the project as a {@link ProjectResponse}
     * @throws ProjectNotFoundException     if the project does not exist
     * @throws ProjectAccessDeniedException if the user does not own the project
     */
    public ProjectResponse getProject(String projectId, CustomUserDetails userDetails) {
        verifyProjectOwnership(projectId, userDetails);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found: " + projectId));

        return toResponse(project);
    }

    // -------------------------------------------------------------------------
    // Read — all
    // -------------------------------------------------------------------------

    /**
     * Retrieve all projects belonging to the authenticated user.
     *
     * <p>Only projects whose IDs are present in the user's projectIds list are returned.</p>
     *
     * @param userDetails the currently authenticated user
     * @return list of the user's projects as {@link ProjectResponse} objects
     */
    public List<ProjectResponse> getAllProjects(CustomUserDetails userDetails) {
        User user = resolveUser(userDetails);
        List<String> projectIds = user.getProjectIds();

        if (projectIds == null || projectIds.isEmpty()) {
            return List.of();
        }

        return projectRepository.findAllByIdIn(projectIds)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    /**
     * Update an existing project's name and description after verifying ownership.
     *
     * @param projectId   the project ID to update
     * @param request     the update payload
     * @param userDetails the currently authenticated user
     * @return the updated project as a {@link ProjectResponse}
     * @throws ProjectNotFoundException     if the project does not exist
     * @throws ProjectAccessDeniedException if the user does not own the project
     */
    public ProjectResponse updateProject(String projectId, UpdateProjectRequest request, CustomUserDetails userDetails) {
        verifyProjectOwnership(projectId, userDetails);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found: " + projectId));

        project.setProjectName(request.getProjectName());
        project.setDescription(request.getDescription());
        project.setUpdatedAt(Instant.now());

        Project updated = projectRepository.save(project);
        log.info("Updated project '{}'", updated.getId());

        return toResponse(updated);
    }

    /**
     * Update project diagram information and status after uploading.
     *
     * @param projectId          the ID of the project to update
     * @param diagramUrl         the URL of the uploaded diagram
     * @param cloudinaryPublicId the public ID from Cloudinary
     * @param status             the new project status (e.g. REVIEWING)
     * @param userDetails        the authenticated user principal
     * @return the updated project response DTO
     */
    public ProjectResponse updateProjectDiagram(
            String projectId,
            String diagramUrl,
            String cloudinaryPublicId,
            ProjectStatus status,
            CustomUserDetails userDetails) {
        verifyProjectOwnership(projectId, userDetails);

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException("Project not found: " + projectId));

        project.setDiagramUrl(diagramUrl);
        project.setCloudinaryPublicId(cloudinaryPublicId);
        project.setStatus(status);
        project.setUpdatedAt(Instant.now());

        Project updated = projectRepository.save(project);
        log.info("Uploaded diagram to project '{}' (status: {})", updated.getId(), status);

        return toResponse(updated);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    /**
     * Delete a project after verifying ownership.
     *
     * <ol>
     *   <li>Verify the user owns the project.</li>
     *   <li>Delete the Project document from MongoDB.</li>
     *   <li>Remove the project ID from User.projectIds.</li>
     *   <li>Save the updated User document.</li>
     * </ol>
     *
     * @param projectId   the project ID to delete
     * @param userDetails the currently authenticated user
     * @throws ProjectNotFoundException     if the project does not exist
     * @throws ProjectAccessDeniedException if the user does not own the project
     */
    public void deleteProject(String projectId, CustomUserDetails userDetails) {
        verifyProjectOwnership(projectId, userDetails);

        if (!projectRepository.existsById(projectId)) {
            throw new ProjectNotFoundException("Project not found: " + projectId);
        }

        projectRepository.deleteById(projectId);
        log.info("Deleted project '{}'", projectId);

        // Ownership cleanup: remove project ID from the user's projectIds list
        User user = resolveUser(userDetails);
        user.getProjectIds().remove(projectId);
        userRepository.save(user);
        log.info("Removed project '{}' from user '{}'", projectId, user.getUsername());
    }

    // -------------------------------------------------------------------------
    // Private / Public helpers
    // -------------------------------------------------------------------------

    /**
     * Load the full User entity from the database using the username stored in userDetails.
     *
     * @param userDetails the authenticated user principal
     * @return the persisted User entity
     */
    private User resolveUser(CustomUserDetails userDetails) {
        // CustomUserDetails holds the User entity directly — no extra DB call needed
        return userDetails.getUser();
    }

    /**
     * Verify that the given project ID is present in the authenticated user's projectIds list.
     *
     * @param projectId   the project ID to check
     * @param userDetails the authenticated user principal
     * @throws ProjectAccessDeniedException if the project ID is not owned by the user
     */
    public void verifyProjectOwnership(String projectId, CustomUserDetails userDetails) {
        User user = resolveUser(userDetails);
        if (user.getProjectIds() == null || !user.getProjectIds().contains(projectId)) {
            throw new ProjectAccessDeniedException(
                    "Access denied: you do not have access to project " + projectId);
        }
    }

    /**
     * Map a {@link Project} entity to a {@link ProjectResponse} DTO.
     *
     * @param project the entity to map
     * @return the response DTO
     */
    private ProjectResponse toResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .projectName(project.getProjectName())
                .description(project.getDescription())
                .diagramUrl(project.getDiagramUrl())
                .cloudinaryPublicId(project.getCloudinaryPublicId())
                .status(project.getStatus() != null ? project.getStatus().name() : null)
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }
}
