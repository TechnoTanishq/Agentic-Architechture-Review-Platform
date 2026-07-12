package com.architectureai.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * DTO representing the raw output of a single specialist agent for a project.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentOutputResponse {

    private String id;

    private String projectId;

    /** Name of the agent, e.g. "security_agent", "cost_agent". */
    private String agentName;

    /**
     * Raw JSON string output from the agent as returned by the Python pipeline.
     * Contains a findings array plus a summary string.
     */
    private String output;

    private Instant createdAt;
}
