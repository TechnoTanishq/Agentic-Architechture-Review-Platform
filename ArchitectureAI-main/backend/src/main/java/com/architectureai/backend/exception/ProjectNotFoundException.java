package com.architectureai.backend.exception;

/**
 * Exception thrown when a requested project cannot be found in the database.
 */
public class ProjectNotFoundException extends RuntimeException {

    public ProjectNotFoundException(String message) {
        super(message);
    }
}
