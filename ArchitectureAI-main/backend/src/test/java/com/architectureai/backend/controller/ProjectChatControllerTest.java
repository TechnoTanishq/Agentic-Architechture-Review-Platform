package com.architectureai.backend.controller;

import com.architectureai.backend.dto.ProjectChatRequest;
import com.architectureai.backend.dto.ProjectChatResponse;
import com.architectureai.backend.entity.User;
import com.architectureai.backend.exception.ProjectAccessDeniedException;
import com.architectureai.backend.security.CustomUserDetails;
import com.architectureai.backend.security.CustomUserDetailsService;
import com.architectureai.backend.security.JwtService;
import com.architectureai.backend.service.ProjectChatService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjectChatController.class)
@AutoConfigureMockMvc(addFilters = false) // Disables Spring Security filters for unit testing
class ProjectChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ProjectChatService projectChatService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private CustomUserDetailsService userDetailsService;

    private CustomUserDetails userDetails;
    private ProjectChatResponse sampleResponse;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .id("user-id")
                .username("testuser")
                .email("test@example.com")
                .projectIds(new ArrayList<>(List.of("project-id")))
                .build();
        userDetails = new CustomUserDetails(user);

        // Set the authenticated principal in the SecurityContext
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);

        sampleResponse = ProjectChatResponse.builder()
                .id("chat-id")
                .projectId("project-id")
                .senderType("USER")
                .message("Test message")
                .timestamp(Instant.now())
                .build();
    }

    @Test
    void sendChatMessage_Success_Returns201() throws Exception {
        ProjectChatRequest request = ProjectChatRequest.builder()
                .message("Test message")
                .build();

        when(projectChatService.saveChatMessage(eq("project-id"), any(ProjectChatRequest.class), any(CustomUserDetails.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/projects/project-id/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("chat-id"))
                .andExpect(jsonPath("$.message").value("Test message"));
    }

    @Test
    void sendChatMessage_ValidationError_Returns400() throws Exception {
        ProjectChatRequest request = ProjectChatRequest.builder()
                .message("") // Blank message
                .build();

        mockMvc.perform(post("/projects/project-id/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors.message").exists());
    }

    @Test
    void sendChatMessage_AccessDenied_Returns403() throws Exception {
        ProjectChatRequest request = ProjectChatRequest.builder()
                .message("Test message")
                .build();

        when(projectChatService.saveChatMessage(eq("foreign-id"), any(ProjectChatRequest.class), any(CustomUserDetails.class)))
                .thenThrow(new ProjectAccessDeniedException("Access denied"));

        mockMvc.perform(post("/projects/foreign-id/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void getChatHistory_Success_Returns200() throws Exception {
        Page<ProjectChatResponse> page = new PageImpl<>(List.of(sampleResponse));

        when(projectChatService.getChatMessages(eq("project-id"), any(Pageable.class), any(CustomUserDetails.class)))
                .thenReturn(page);

        mockMvc.perform(get("/projects/project-id/chat")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value("chat-id"))
                .andExpect(jsonPath("$.totalElements").value(1));
    }
}
