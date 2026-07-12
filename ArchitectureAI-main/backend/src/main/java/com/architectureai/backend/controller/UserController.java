package com.architectureai.backend.controller;

import com.architectureai.backend.dto.UserResponse;
import com.architectureai.backend.entity.User;
import com.architectureai.backend.security.CustomUserDetails;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller exposing user-related endpoints.
 */
@RestController
@RequestMapping("/users")
public class UserController {

    /**
     * Retrieve the currently authenticated user's profile.
     *
     * @param userDetails the authenticated user details injected by Spring Security
     * @return the user details excluding sensitive information
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getMe(@AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails.getUser();
        UserResponse response = UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .organization(user.getOrganization())
                .createdAt(user.getCreatedAt())
                .build();
        return ResponseEntity.ok(response);
    }
}
