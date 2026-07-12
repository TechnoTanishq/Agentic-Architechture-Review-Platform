package com.architectureai.backend.service;

import com.architectureai.backend.dto.AuthResponse;
import com.architectureai.backend.dto.LoginRequest;
import com.architectureai.backend.dto.RegisterRequest;
import com.architectureai.backend.entity.User;
import com.architectureai.backend.exception.InvalidCredentialsException;
import com.architectureai.backend.exception.UserAlreadyExistsException;
import com.architectureai.backend.repository.UserRepository;
import com.architectureai.backend.security.CustomUserDetails;
import com.architectureai.backend.security.JwtService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;

/**
 * Service providing authentication business logic for registration and login.
 */
@Service
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    /**
     * Register a new user in the system.
     *
     * @param request the registration request DTO
     * @return the AuthResponse containing the token and user metadata
     */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserAlreadyExistsException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email is already registered");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .organization(request.getOrganization())
                .projectIds(new ArrayList<>())
                .createdAt(Instant.now())
                .build();

        User savedUser = userRepository.save(user);
        log.info("Registered new user: {}", savedUser.getUsername());

        CustomUserDetails userDetails = new CustomUserDetails(savedUser);
        String token = jwtService.generateToken(userDetails);

        return AuthResponse.builder()
                .token(token)
                .username(savedUser.getUsername())
                .email(savedUser.getEmail())
                .organization(savedUser.getOrganization())
                .build();
    }

    /**
     * Authenticate an existing user.
     *
     * @param request the login request DTO
     * @return the AuthResponse containing the token and user metadata
     */
    public AuthResponse login(LoginRequest request) {
        try {
            // First determine if we should look up by username or email to perform
            // authentication
            User user = userRepository.findByUsername(request.getUsername())
                    .or(() -> userRepository.findByEmail(request.getUsername()))
                    .orElseThrow(() -> new InvalidCredentialsException("Invalid username/email or password"));

            // Authenticate using the username defined in the system
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            user.getUsername(),
                            request.getPassword()));

            log.info("Successfully authenticated user: {}", user.getUsername());
            CustomUserDetails userDetails = new CustomUserDetails(user);
            String token = jwtService.generateToken(userDetails);

            return AuthResponse.builder()
                    .token(token)
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .organization(user.getOrganization())
                    .build();

        } catch (BadCredentialsException e) {
            throw new InvalidCredentialsException("Invalid username/email or password");
        }
    }
}
