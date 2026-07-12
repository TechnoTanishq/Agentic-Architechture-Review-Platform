package com.architectureai.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * DTO representing a chat message returned to the client.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectChatResponse {

    private String id;

    private String projectId;

    private String senderType;

    private String message;

    private Instant timestamp;
}
