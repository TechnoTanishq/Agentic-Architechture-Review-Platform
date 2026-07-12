package com.architectureai.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Entity representing a Project stored in the MongoDB "projects" collection.
 *
 * <p>Projects do NOT contain a userId. Ownership is maintained exclusively
 * through {@link User#getProjectIds()} in the User document.</p>
 */
@Document(collection = "projects")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Project {

    @Id
    private String id;

    private String projectName;

    private String description;

    private String diagramUrl;

    private String cloudinaryPublicId;

    private ProjectStatus status;

    private Instant createdAt;

    private Instant updatedAt;
}
