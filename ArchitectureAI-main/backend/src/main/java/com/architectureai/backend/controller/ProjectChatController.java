package com.architectureai.backend.controller;

import com.architectureai.backend.dto.ProjectChatRequest;
import com.architectureai.backend.dto.ProjectChatResponse;
import com.architectureai.backend.security.CustomUserDetails;
import com.architectureai.backend.service.ProjectChatService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for project review chat endpoints.
 */
@RestController
@RequestMapping("/projects/{projectId}/chat")
public class ProjectChatController {

    private final ProjectChatService projectChatService;

    public ProjectChatController(ProjectChatService projectChatService) {
        this.projectChatService = projectChatService;
    }

    /**
     * Send a new chat message for a project.
     *
     * @param projectId   the ID of the project
     * @param request     the message payload
     * @param userDetails the currently authenticated user
     * @return the created message details with HTTP 201
     */
    @PostMapping
    public ResponseEntity<ProjectChatResponse> sendChatMessage(
            @PathVariable String projectId,
            @Valid @RequestBody ProjectChatRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        ProjectChatResponse response = projectChatService.saveChatMessage(projectId, request, userDetails);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Retrieve the chat history for a project, with support for pagination.
     *
     * @param projectId   the ID of the project
     * @param pageable    pagination request parameters
     * @param userDetails the currently authenticated user
     * @return page of chat messages with HTTP 200
     */
    @GetMapping
    public ResponseEntity<Page<ProjectChatResponse>> getChatHistory(
            @PathVariable String projectId,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Page<ProjectChatResponse> responses = projectChatService.getChatMessages(projectId, pageable, userDetails);
        return ResponseEntity.ok(responses);
    }
}
