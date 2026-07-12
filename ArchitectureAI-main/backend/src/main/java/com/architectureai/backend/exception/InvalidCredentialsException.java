package com.architectureai.backend.exception;

/**
 * Exception thrown when authentication fails due to incorrect credentials.
 */
public class InvalidCredentialsException extends RuntimeException {
    public InvalidCredentialsException(String message) {
        super(message);
    }
}
