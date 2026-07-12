package com.architectureai.backend.exception;

/**
 * Exception thrown when a user registration fails because the username or email is already taken.
 */
public class UserAlreadyExistsException extends RuntimeException {
    public UserAlreadyExistsException(String message) {
        super(message);
    }
}
