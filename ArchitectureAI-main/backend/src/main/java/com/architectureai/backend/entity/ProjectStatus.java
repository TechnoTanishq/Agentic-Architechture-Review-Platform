package com.architectureai.backend.entity;

/**
 * Represents the current analysis status of a project.
 */
public enum ProjectStatus {
    /**
     * Waiting for the architecture diagram to be uploaded.
     */
    UPLOADING,

    /**
     * Specialist AI agents are running reviews on the uploaded diagram.
     */
    REVIEWING,

    /**
     * All agents completed their analysis, and the report has been successfully generated.
     */
    COMPLETED,

    /**
     * One or more stages in the review process failed.
     */
    FAILED
}
