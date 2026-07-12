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
 * Entity representing a chat message inside a project review history.
 */
@Document(collection = "project_chats")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectChat {

    @Id
    private String id;

    @Indexed
    private String projectId;

    private SenderType senderType;

    private String message;

    private Instant timestamp;
}
