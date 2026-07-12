package com.architectureai.backend.service;

import com.architectureai.backend.dto.ProjectChatRequest;
import com.architectureai.backend.dto.ProjectChatResponse;
import com.architectureai.backend.entity.ProjectChat;
import com.architectureai.backend.entity.SenderType;
import com.architectureai.backend.repository.ProjectChatRepository;
import com.architectureai.backend.security.CustomUserDetails;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Service providing business logic for managing chat messages associated with projects.
 */
@Service
@Slf4j
public class ProjectChatService {

    private final ProjectChatRepository projectChatRepository;
    private final ProjectService projectService;

    /**
     * Constructs a new {@code ProjectChatService} using constructor injection.
     *
     * @param projectChatRepository repository for project chats
     * @param projectService        service for project operations
     */
    public ProjectChatService(ProjectChatRepository projectChatRepository, ProjectService projectService) {
        this.projectChatRepository = projectChatRepository;
        this.projectService = projectService;
    }

    /**
     * Save a new chat message sent by the user for a specific project.
     *
     * @param projectId   the project ID
     * @param request     the message payload
     * @param userDetails the currently authenticated user
     * @return the saved message as a DTO
     */
    public ProjectChatResponse saveChatMessage(String projectId, ProjectChatRequest request, CustomUserDetails userDetails) {
        // Enforce ownership: verify user owns this project before saving chat
        projectService.verifyProjectOwnership(projectId, userDetails);

        ProjectChat chat = ProjectChat.builder()
                .projectId(projectId)
                .senderType(SenderType.USER)
                .message(request.getMessage())
                .timestamp(Instant.now())
                .build();

        ProjectChat saved = projectChatRepository.save(chat);
        log.info("Saved user chat message for project '{}' with id '{}'", projectId, saved.getId());

        return toResponse(saved);
    }

    /**
     * Retrieve a paginated page of chat history for a specific project.
     *
     * @param projectId   the project ID
     * @param pageable    the pagination info
     * @param userDetails the currently authenticated user
     * @return a page of chat messages mapped to DTOs
     */
    public Page<ProjectChatResponse> getChatMessages(String projectId, Pageable pageable, CustomUserDetails userDetails) {
        // Enforce ownership: verify user owns this project before retrieving history
        projectService.verifyProjectOwnership(projectId, userDetails);

        Page<ProjectChat> chatPage = projectChatRepository.findAllByProjectId(projectId, pageable);
        return chatPage.map(this::toResponse);
    }

    /**
     * Map a {@link ProjectChat} entity to a {@link ProjectChatResponse} DTO.
     *
     * @param chat the entity to map
     * @return the mapped response DTO
     */
    private ProjectChatResponse toResponse(ProjectChat chat) {
        return ProjectChatResponse.builder()
                .id(chat.getId())
                .projectId(chat.getProjectId())
                .senderType(chat.getSenderType() != null ? chat.getSenderType().name() : null)
                .message(chat.getMessage())
                .timestamp(chat.getTimestamp())
                .build();
    }
}
