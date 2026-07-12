package com.architectureai.backend.service;

import com.architectureai.backend.dto.ProjectChatRequest;
import com.architectureai.backend.dto.ProjectChatResponse;
import com.architectureai.backend.entity.ProjectChat;
import com.architectureai.backend.entity.SenderType;
import com.architectureai.backend.entity.User;
import com.architectureai.backend.exception.ProjectAccessDeniedException;
import com.architectureai.backend.repository.ProjectChatRepository;
import com.architectureai.backend.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectChatServiceTest {

    @Mock
    private ProjectChatRepository projectChatRepository;

    @Mock
    private ProjectService projectService;

    private ProjectChatService projectChatService;

    private CustomUserDetails userDetails;
    private ProjectChat sampleChat;

    @BeforeEach
    void setUp() {
        projectChatService = new ProjectChatService(projectChatRepository, projectService);

        User user = User.builder()
                .id("user-id")
                .username("testuser")
                .projectIds(new ArrayList<>(List.of("project-id")))
                .build();
        userDetails = new CustomUserDetails(user);

        sampleChat = ProjectChat.builder()
                .id("chat-id")
                .projectId("project-id")
                .senderType(SenderType.USER)
                .message("Test message")
                .timestamp(Instant.now())
                .build();
    }

    @Test
    void saveChatMessage_Success() {
        // Arrange
        ProjectChatRequest request = ProjectChatRequest.builder()
                .message("Test message")
                .build();

        doNothing().when(projectService).verifyProjectOwnership(eq("project-id"), eq(userDetails));
        when(projectChatRepository.save(any(ProjectChat.class))).thenReturn(sampleChat);

        // Act
        ProjectChatResponse response = projectChatService.saveChatMessage("project-id", request, userDetails);

        // Assert
        assertNotNull(response);
        assertEquals("chat-id", response.getId());
        assertEquals("project-id", response.getProjectId());
        assertEquals("USER", response.getSenderType());
        assertEquals("Test message", response.getMessage());
        verify(projectService, times(1)).verifyProjectOwnership("project-id", userDetails);
        verify(projectChatRepository, times(1)).save(any(ProjectChat.class));
    }

    @Test
    void saveChatMessage_AccessDenied() {
        // Arrange
        ProjectChatRequest request = ProjectChatRequest.builder()
                .message("Test message")
                .build();

        doThrow(new ProjectAccessDeniedException("Access denied"))
                .when(projectService).verifyProjectOwnership(eq("foreign-id"), eq(userDetails));

        // Act & Assert
        assertThrows(ProjectAccessDeniedException.class,
                () -> projectChatService.saveChatMessage("foreign-id", request, userDetails));
        verify(projectChatRepository, never()).save(any());
    }

    @Test
    void getChatMessages_Success() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);
        Page<ProjectChat> page = new PageImpl<>(List.of(sampleChat));

        doNothing().when(projectService).verifyProjectOwnership(eq("project-id"), eq(userDetails));
        when(projectChatRepository.findAllByProjectId(eq("project-id"), eq(pageable))).thenReturn(page);

        // Act
        Page<ProjectChatResponse> responsePage = projectChatService.getChatMessages("project-id", pageable, userDetails);

        // Assert
        assertNotNull(responsePage);
        assertEquals(1, responsePage.getTotalElements());
        assertEquals("chat-id", responsePage.getContent().get(0).getId());
        verify(projectService, times(1)).verifyProjectOwnership("project-id", userDetails);
        verify(projectChatRepository, times(1)).findAllByProjectId("project-id", pageable);
    }

    @Test
    void getChatMessages_AccessDenied() {
        // Arrange
        Pageable pageable = PageRequest.of(0, 10);

        doThrow(new ProjectAccessDeniedException("Access denied"))
                .when(projectService).verifyProjectOwnership(eq("foreign-id"), eq(userDetails));

        // Act & Assert
        assertThrows(ProjectAccessDeniedException.class,
                () -> projectChatService.getChatMessages("foreign-id", pageable, userDetails));
        verify(projectChatRepository, never()).findAllByProjectId(any(), any());
    }
}
