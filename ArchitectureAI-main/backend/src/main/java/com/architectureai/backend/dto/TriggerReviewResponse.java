package com.architectureai.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO returned immediately when a review is triggered asynchronously.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TriggerReviewResponse {

    private String projectId;

    /** Human-readable status message, e.g. "Review started". */
    private String message;

    /** Current project status after triggering, e.g. "REVIEWING". */
    private String status;
}
