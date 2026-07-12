package com.architectureai.backend.exception;

/**
 * Exception thrown when an authenticated user attempts to access a project
 * that is not referenced in their own projectIds list.
 */
public class ProjectAccessDeniedException extends RuntimeException {

    public ProjectAccessDeniedException(String message) {
        super(message);
    }
}
