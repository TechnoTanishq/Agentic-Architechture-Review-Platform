package com.architectureai.backend.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

/**
 * Entity representing the analysis output of a single specialist agent for a project.
 */
@Document(collection = "agent_outputs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentOutput {

    @Id
    private String id;

    @Indexed
    private String projectId;

    private String agentName;

    private String output;

    private Instant createdAt;
}
