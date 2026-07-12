package com.architectureai.backend.service;

import com.architectureai.backend.dto.CreateProjectRequest;
import com.architectureai.backend.dto.ProjectResponse;
import com.architectureai.backend.dto.UpdateProjectRequest;
import com.architectureai.backend.entity.Project;
import com.architectureai.backend.entity.User;
import com.architectureai.backend.exception.ProjectAccessDeniedException;
import com.architectureai.backend.exception.ProjectNotFoundException;
import com.architectureai.backend.repository.ProjectRepository;
import com.architectureai.backend.repository.UserRepository;
import com.architectureai.backend.security.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserRepository userRepository;

    private ProjectService projectService;

    // Reusable test data
    private User testUser;
    private CustomUserDetails userDetails;
    private Project testProject;

    @BeforeEach
    void setUp() {
        projectService = new ProjectService(projectRepository, userRepository);

        testUser = User.builder()
                .id("user-id")
                .username("testuser")
                .email("test@example.com")
                .projectIds(new ArrayList<>(List.of("project-id")))
                .build();

        userDetails = new CustomUserDetails(testUser);

        testProject = Project.builder()
                .id("project-id")
                .projectName("Test Project")
                .description("A test project")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    // -------------------------------------------------------------------------
    // createProject
    // -------------------------------------------------------------------------

    @Test
    void createProject_Success() {
        // Arrange
        CreateProjectRequest request = CreateProjectRequest.builder()
                .projectName("New Project")
                .description("Description")
                .build();

        Project saved = Project.builder()
                .id("new-project-id")
                .projectName("New Project")
                .description("Description")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(projectRepository.save(any(Project.class))).thenReturn(saved);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        ProjectResponse response = projectService.createProject(request, userDetails);

        // Assert
        assertNotNull(response);
        assertEquals("new-project-id", response.getId());
        assertEquals("New Project", response.getProjectName());
        assertEquals("Description", response.getDescription());
        verify(projectRepository, times(1)).save(any(Project.class));
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void createProject_AddsProjectIdToUser() {
        // Arrange
        User userWithNoProjects = User.builder()
                .id("user-id")
                .username("testuser")
                .projectIds(new ArrayList<>())
                .build();
        CustomUserDetails freshDetails = new CustomUserDetails(userWithNoProjects);

        CreateProjectRequest request = CreateProjectRequest.builder()
                .projectName("My First Project")
                .build();

        Project saved = Project.builder()
                .id("brand-new-id")
                .projectName("My First Project")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(projectRepository.save(any(Project.class))).thenReturn(saved);
        when(userRepository.save(any(User.class))).thenReturn(userWithNoProjects);

        // Act
        projectService.createProject(request, freshDetails);

        // Assert: user's projectIds now contains the new project ID
        assertTrue(userWithNoProjects.getProjectIds().contains("brand-new-id"));
        verify(userRepository, times(1)).save(userWithNoProjects);
    }

    // -------------------------------------------------------------------------
    // getProject
    // -------------------------------------------------------------------------

    @Test
    void getProject_Success() {
        // Arrange
        when(projectRepository.findById("project-id")).thenReturn(Optional.of(testProject));

        // Act
        ProjectResponse response = projectService.getProject("project-id", userDetails);

        // Assert
        assertNotNull(response);
        assertEquals("project-id", response.getId());
        assertEquals("Test Project", response.getProjectName());
    }

    @Test
    void getProject_NotOwned_ThrowsAccessDenied() {
        // Act & Assert
        assertThrows(ProjectAccessDeniedException.class,
                () -> projectService.getProject("other-project-id", userDetails));
        verify(projectRepository, never()).findById(any());
    }

    @Test
    void getProject_NotFound_ThrowsProjectNotFoundException() {
        // Arrange — user owns the ID but document is gone
        when(projectRepository.findById("project-id")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ProjectNotFoundException.class,
                () -> projectService.getProject("project-id", userDetails));
    }

    // -------------------------------------------------------------------------
    // getAllProjects
    // -------------------------------------------------------------------------

    @Test
    void getAllProjects_ReturnsList() {
        // Arrange
        when(projectRepository.findAllByIdIn(List.of("project-id"))).thenReturn(List.of(testProject));

        // Act
        List<ProjectResponse> responses = projectService.getAllProjects(userDetails);

        // Assert
        assertNotNull(responses);
        assertEquals(1, responses.size());
        assertEquals("project-id", responses.get(0).getId());
    }

    @Test
    void getAllProjects_EmptyProjectIds_ReturnsEmptyList() {
        // Arrange
        User userNoProjects = User.builder()
                .id("user-id")
                .username("testuser")
                .projectIds(new ArrayList<>())
                .build();
        CustomUserDetails noProjectsDetails = new CustomUserDetails(userNoProjects);

        // Act
        List<ProjectResponse> responses = projectService.getAllProjects(noProjectsDetails);

        // Assert
        assertNotNull(responses);
        assertTrue(responses.isEmpty());
        verify(projectRepository, never()).findAllByIdIn(any());
    }

    // -------------------------------------------------------------------------
    // updateProject
    // -------------------------------------------------------------------------

    @Test
    void updateProject_Success() {
        // Arrange
        UpdateProjectRequest request = UpdateProjectRequest.builder()
                .projectName("Updated Name")
                .description("Updated Description")
                .build();

        when(projectRepository.findById("project-id")).thenReturn(Optional.of(testProject));
        when(projectRepository.save(any(Project.class))).thenReturn(testProject);

        // Act
        ProjectResponse response = projectService.updateProject("project-id", request, userDetails);

        // Assert
        assertNotNull(response);
        verify(projectRepository, times(1)).save(any(Project.class));
    }

    @Test
    void updateProject_NotOwned_ThrowsAccessDenied() {
        // Arrange
        UpdateProjectRequest request = UpdateProjectRequest.builder()
                .projectName("Updated Name")
                .build();

        // Act & Assert
        assertThrows(ProjectAccessDeniedException.class,
                () -> projectService.updateProject("foreign-project-id", request, userDetails));
        verify(projectRepository, never()).findById(any());
        verify(projectRepository, never()).save(any());
    }

    @Test
    void updateProject_NotFound_ThrowsProjectNotFoundException() {
        // Arrange
        UpdateProjectRequest request = UpdateProjectRequest.builder()
                .projectName("Updated Name")
                .build();

        when(projectRepository.findById("project-id")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ProjectNotFoundException.class,
                () -> projectService.updateProject("project-id", request, userDetails));
    }

    // -------------------------------------------------------------------------
    // deleteProject
    // -------------------------------------------------------------------------

    @Test
    void deleteProject_Success() {
        // Arrange
        when(projectRepository.existsById("project-id")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        projectService.deleteProject("project-id", userDetails);

        // Assert
        verify(projectRepository, times(1)).deleteById("project-id");
        verify(userRepository, times(1)).save(testUser);
        assertFalse(testUser.getProjectIds().contains("project-id"));
    }

    @Test
    void deleteProject_NotOwned_ThrowsAccessDenied() {
        // Act & Assert
        assertThrows(ProjectAccessDeniedException.class,
                () -> projectService.deleteProject("foreign-project-id", userDetails));
        verify(projectRepository, never()).deleteById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteProject_NotFound_ThrowsProjectNotFoundException() {
        // Arrange
        when(projectRepository.existsById("project-id")).thenReturn(false);

        // Act & Assert
        assertThrows(ProjectNotFoundException.class,
                () -> projectService.deleteProject("project-id", userDetails));
        verify(projectRepository, never()).deleteById(any());
        verify(userRepository, never()).save(any());
    }
}
