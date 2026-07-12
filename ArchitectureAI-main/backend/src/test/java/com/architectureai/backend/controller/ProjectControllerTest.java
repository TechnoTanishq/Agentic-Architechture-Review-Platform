package com.architectureai.backend.controller;

import com.architectureai.backend.dto.CreateProjectRequest;
import com.architectureai.backend.dto.ProjectResponse;
import com.architectureai.backend.dto.UpdateProjectRequest;
import com.architectureai.backend.entity.User;
import com.architectureai.backend.exception.ProjectAccessDeniedException;
import com.architectureai.backend.exception.ProjectNotFoundException;
import com.architectureai.backend.security.CustomUserDetails;
import com.architectureai.backend.security.CustomUserDetailsService;
import com.architectureai.backend.security.JwtService;
import com.architectureai.backend.service.CloudinaryService;
import com.architectureai.backend.service.ProjectService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
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
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProjectController.class)
@AutoConfigureMockMvc(addFilters = false) // Disables Spring Security filters for unit testing
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ProjectService projectService;

    @MockitoBean
    private CloudinaryService cloudinaryService;

    @MockitoBean
    private JwtService jwtService;

    @MockitoBean
    private CustomUserDetailsService userDetailsService;

    private CustomUserDetails userDetails;
    private ProjectResponse sampleResponse;

    @BeforeEach
    void setUp() {
        User user = User.builder()
                .id("user-id")
                .username("testuser")
                .email("test@example.com")
                .projectIds(new ArrayList<>(List.of("project-id")))
                .build();
        userDetails = new CustomUserDetails(user);

        // Set the authenticated principal in the SecurityContext for @AuthenticationPrincipal injection
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);

        sampleResponse = ProjectResponse.builder()
                .id("project-id")
                .projectName("Test Project")
                .description("A test description")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    // -------------------------------------------------------------------------
    // POST /projects
    // -------------------------------------------------------------------------

    @Test
    void createProject_Success_Returns201() throws Exception {
        CreateProjectRequest request = CreateProjectRequest.builder()
                .projectName("Test Project")
                .description("A test description")
                .build();

        when(projectService.createProject(any(CreateProjectRequest.class), any(CustomUserDetails.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("project-id"))
                .andExpect(jsonPath("$.projectName").value("Test Project"));
    }

    @Test
    void createProject_ValidationError_Returns400() throws Exception {
        CreateProjectRequest request = CreateProjectRequest.builder()
                .projectName("") // blank — violates @NotBlank
                .build();

        mockMvc.perform(post("/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors.projectName").exists());
    }

    // -------------------------------------------------------------------------
    // GET /projects
    // -------------------------------------------------------------------------

    @Test
    void getAllProjects_Success_Returns200() throws Exception {
        when(projectService.getAllProjects(any(CustomUserDetails.class)))
                .thenReturn(List.of(sampleResponse));

        mockMvc.perform(get("/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("project-id"))
                .andExpect(jsonPath("$[0].projectName").value("Test Project"));
    }

    @Test
    void getAllProjects_Empty_Returns200WithEmptyList() throws Exception {
        when(projectService.getAllProjects(any(CustomUserDetails.class)))
                .thenReturn(List.of());

        mockMvc.perform(get("/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    // -------------------------------------------------------------------------
    // GET /projects/{projectId}
    // -------------------------------------------------------------------------

    @Test
    void getProject_Success_Returns200() throws Exception {
        when(projectService.getProject(eq("project-id"), any(CustomUserDetails.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(get("/projects/project-id"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("project-id"))
                .andExpect(jsonPath("$.projectName").value("Test Project"));
    }

    @Test
    void getProject_NotFound_Returns404() throws Exception {
        when(projectService.getProject(eq("unknown-id"), any(CustomUserDetails.class)))
                .thenThrow(new ProjectNotFoundException("Project not found: unknown-id"));

        mockMvc.perform(get("/projects/unknown-id"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void getProject_AccessDenied_Returns403() throws Exception {
        when(projectService.getProject(eq("foreign-id"), any(CustomUserDetails.class)))
                .thenThrow(new ProjectAccessDeniedException("Access denied"));

        mockMvc.perform(get("/projects/foreign-id"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    // -------------------------------------------------------------------------
    // PUT /projects/{projectId}
    // -------------------------------------------------------------------------

    @Test
    void updateProject_Success_Returns200() throws Exception {
        UpdateProjectRequest request = UpdateProjectRequest.builder()
                .projectName("Updated Project")
                .description("Updated description")
                .build();

        ProjectResponse updated = ProjectResponse.builder()
                .id("project-id")
                .projectName("Updated Project")
                .description("Updated description")
                .createdAt(sampleResponse.getCreatedAt())
                .updatedAt(Instant.now())
                .build();

        when(projectService.updateProject(eq("project-id"), any(UpdateProjectRequest.class), any(CustomUserDetails.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/projects/project-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectName").value("Updated Project"));
    }

    @Test
    void updateProject_ValidationError_Returns400() throws Exception {
        UpdateProjectRequest request = UpdateProjectRequest.builder()
                .projectName("") // blank — violates @NotBlank
                .build();

        mockMvc.perform(put("/projects/project-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.projectName").exists());
    }

    @Test
    void updateProject_AccessDenied_Returns403() throws Exception {
        UpdateProjectRequest request = UpdateProjectRequest.builder()
                .projectName("Updated Project")
                .build();

        when(projectService.updateProject(eq("foreign-id"), any(UpdateProjectRequest.class), any(CustomUserDetails.class)))
                .thenThrow(new ProjectAccessDeniedException("Access denied"));

        mockMvc.perform(put("/projects/foreign-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    // -------------------------------------------------------------------------
    // DELETE /projects/{projectId}
    // -------------------------------------------------------------------------

    @Test
    void deleteProject_Success_Returns204() throws Exception {
        mockMvc.perform(delete("/projects/project-id"))
                .andExpect(status().isNoContent());
    }

    @Test
    void deleteProject_NotFound_Returns404() throws Exception {
        doThrow(new ProjectNotFoundException("Project not found: unknown-id"))
                .when(projectService).deleteProject(eq("unknown-id"), any(CustomUserDetails.class));

        mockMvc.perform(delete("/projects/unknown-id"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void deleteProject_AccessDenied_Returns403() throws Exception {
        doThrow(new ProjectAccessDeniedException("Access denied"))
                .when(projectService).deleteProject(eq("foreign-id"), any(CustomUserDetails.class));

        mockMvc.perform(delete("/projects/foreign-id"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    // -------------------------------------------------------------------------
    // POST /projects/{projectId}/upload
    // -------------------------------------------------------------------------

    @Test
    @SuppressWarnings("unchecked")
    void uploadDiagram_Success_Returns200() throws Exception {
        org.springframework.mock.web.MockMultipartFile file =
                new org.springframework.mock.web.MockMultipartFile("file", "diagram.png", "image/png", "mock image data".getBytes());

        java.util.Map<String, Object> uploadResult = java.util.Map.of(
                "url", "http://cloudinary.com/diagram.png",
                "public_id", "diagram_123"
        );

        ProjectResponse updatedResponse = ProjectResponse.builder()
                .id("project-id")
                .projectName("Test Project")
                .diagramUrl("http://cloudinary.com/diagram.png")
                .cloudinaryPublicId("diagram_123")
                .status("REVIEWING")
                .createdAt(sampleResponse.getCreatedAt())
                .updatedAt(Instant.now())
                .build();

        doNothing().when(projectService).verifyProjectOwnership(eq("project-id"), any(CustomUserDetails.class));
        when(cloudinaryService.uploadImage(any(org.springframework.web.multipart.MultipartFile.class))).thenReturn(uploadResult);
        when(projectService.updateProjectDiagram(eq("project-id"), eq("http://cloudinary.com/diagram.png"), eq("diagram_123"), any(), any()))
                .thenReturn(updatedResponse);

        mockMvc.perform(multipart("/projects/project-id/upload").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("project-id"))
                .andExpect(jsonPath("$.diagramUrl").value("http://cloudinary.com/diagram.png"))
                .andExpect(jsonPath("$.status").value("REVIEWING"));
    }

    @Test
    void uploadDiagram_AccessDenied_Returns403() throws Exception {
        org.springframework.mock.web.MockMultipartFile file =
                new org.springframework.mock.web.MockMultipartFile("file", "diagram.png", "image/png", "mock image data".getBytes());

        doThrow(new ProjectAccessDeniedException("Access denied"))
                .when(projectService).verifyProjectOwnership(eq("foreign-id"), any(CustomUserDetails.class));

        mockMvc.perform(multipart("/projects/foreign-id/upload").file(file))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }
}
