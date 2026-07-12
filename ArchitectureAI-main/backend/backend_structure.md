# ArchitectureAI Backend — Full Structure & Call Flow

## Tech Stack
| Item | Detail |
|---|---|
| Framework | Spring Boot 3.5.16 |
| Language | Java 21 |
| Database | MongoDB (Spring Data MongoDB) |
| Auth | JWT via JJWT 0.12.6 |
| Security | Spring Security 6 (stateless) |
| Utilities | Lombok, Jakarta Validation, Spring Actuator |

---

## File Tree

```
backend/src/main/java/com/architectureai/backend/
│
├── BackendApplication.java               ← Entry point (@SpringBootApplication)
│
├── config/
│   └── SecurityConfig.java               ← Spring Security + CORS + JWT filter wiring
│
├── controller/
│   ├── AuthController.java               ← POST /auth/register, POST /auth/login
│   └── UserController.java               ← GET /users/me
│
├── dto/
│   ├── RegisterRequest.java              ← Input: username, email, password, organization
│   ├── LoginRequest.java                 ← Input: username (or email), password
│   ├── AuthResponse.java                 ← Output: token, type, username, email, organization
│   ├── UserResponse.java                 ← Output: id, username, email, organization, createdAt
│   └── ErrorResponse.java                ← Output: timestamp, status, error, message, errors map
│
├── entity/
│   └── User.java                         ← MongoDB document (@Document "users")
│                                            Fields: id, username*, email*, passwordHash, organization, projectIds, createdAt
│                                            (* unique indexed)
│
├── repository/
│   └── UserRepository.java               ← MongoRepository<User, String>
│                                            findByUsername(), findByEmail(),
│                                            existsByUsername(), existsByEmail()
│
├── security/
│   ├── JwtService.java                   ← Token generation, validation, claim extraction
│   ├── JwtAuthenticationFilter.java      ← OncePerRequestFilter: reads Bearer token → sets SecurityContext
│   ├── CustomUserDetails.java            ← UserDetails adapter wrapping User entity
│   └── CustomUserDetailsService.java     ← UserDetailsService: loads user by username OR email
│
├── service/
│   └── AuthService.java                  ← register() and login() business logic
│
└── exception/
    ├── GlobalExceptionHandler.java        ← @RestControllerAdvice: handles all exceptions centrally
    ├── UserAlreadyExistsException.java    ← 409 Conflict
    ├── InvalidCredentialsException.java   ← 401 Unauthorized
    └── UserNotFoundException.java         ← 404 Not Found

backend/src/test/java/com/architectureai/backend/
├── BackendApplicationTests.java
├── controller/
│   └── AuthControllerTest.java
└── service/
    └── AuthServiceTest.java
```

---

## Endpoints Implemented

| Method | Path | Auth Required | Handler |
|---|---|---|---|
| POST | `/auth/register` | ❌ Public | `AuthController.register()` |
| POST | `/auth/login` | ❌ Public | `AuthController.login()` |
| GET | `/users/me` | ✅ Bearer JWT | `UserController.getMe()` |
| POST | `/projects` | ✅ Bearer JWT | `ProjectController.createProject()` |
| GET | `/projects` | ✅ Bearer JWT | `ProjectController.getAllProjects()` |
| GET | `/projects/{projectId}` | ✅ Bearer JWT | `ProjectController.getProject()` |
| PUT | `/projects/{projectId}` | ✅ Bearer JWT | `ProjectController.updateProject()` |
| DELETE | `/projects/{projectId}` | ✅ Bearer JWT | `ProjectController.deleteProject()` |
| POST | `/projects/{projectId}/upload` | ✅ Bearer JWT | `ProjectController.uploadDiagram()` |
| POST | `/projects/{projectId}/chat` | ✅ Bearer JWT | `ProjectChatController.sendChatMessage()` |
| GET | `/projects/{projectId}/chat` | ✅ Bearer JWT | `ProjectChatController.getChatHistory()` |

---

## Call Flows

### 1. Registration — `POST /auth/register`

```
HTTP Request
  └─► JwtAuthenticationFilter          (no Bearer header → passes through)
        └─► SecurityConfig             (permitAll on /auth/**)
              └─► AuthController.register(@Valid RegisterRequest)
                    └─► AuthService.register()
                          ├─► UserRepository.existsByUsername()   → 409 if taken
                          ├─► UserRepository.existsByEmail()      → 409 if taken
                          ├─► PasswordEncoder.encode(password)    (BCrypt)
                          ├─► UserRepository.save(newUser)        → MongoDB
                          ├─► new CustomUserDetails(savedUser)
                          └─► JwtService.generateToken(userDetails)
                                └─► buildToken() → HMAC-SHA signed JWT (24h TTL)
                    ← AuthResponse { token, type:"Bearer", username, email, organization }
HTTP 201 Created
```

### 2. Login — `POST /auth/login`

```
HTTP Request
  └─► JwtAuthenticationFilter          (no Bearer header → passes through)
        └─► SecurityConfig             (permitAll on /auth/**)
              └─► AuthController.login(@Valid LoginRequest)
                    └─► AuthService.login()
                          ├─► UserRepository.findByUsername() OR findByEmail()
                          │     → 401 if not found
                          ├─► AuthenticationManager.authenticate(
                          │       UsernamePasswordAuthenticationToken)
                          │     └─► DaoAuthenticationProvider
                          │           ├─► CustomUserDetailsService.loadUserByUsername()
                          │           │     └─► UserRepository.findByUsername / findByEmail
                          │           └─► BCryptPasswordEncoder.matches()
                          │                 → BadCredentialsException → 401 if wrong
                          ├─► new CustomUserDetails(user)
                          └─► JwtService.generateToken(userDetails)
                    ← AuthResponse { token, type:"Bearer", username, email, organization }
HTTP 200 OK
```

### 3. Authenticated Request — `GET /users/me`

```
HTTP Request (Authorization: Bearer <token>)
  └─► JwtAuthenticationFilter
        ├─► JwtService.extractUsername(token)
        ├─► CustomUserDetailsService.loadUserByUsername(username)
        │     └─► UserRepository.findByUsername() / findByEmail()
        ├─► JwtService.isTokenValid(token, userDetails)
        └─► Sets SecurityContextHolder with UsernamePasswordAuthenticationToken
              └─► SecurityConfig             (.anyRequest().authenticated() → passes)
                    └─► UserController.getMe(@AuthenticationPrincipal CustomUserDetails)
                          └─► Reads user from CustomUserDetails.getUser()
                    ← UserResponse { id, username, email, organization, createdAt }
HTTP 200 OK
```

### 4. Error Handling — all errors centrally handled

```
Any Exception
  └─► GlobalExceptionHandler (@RestControllerAdvice)
        ├─► MethodArgumentNotValidException → 400 Bad Request + field-level errors map
        ├─► UserAlreadyExistsException      → 409 Conflict
        ├─► InvalidCredentialsException     → 401 Unauthorized
        ├─► UserNotFoundException           → 404 Not Found
        └─► Exception (catch-all)           → 500 Internal Server Error
                    ← ErrorResponse { timestamp, status, error, message, errors? }
```

---

## Security Architecture

```
Incoming Request
    │
    ▼
JwtAuthenticationFilter  (runs BEFORE UsernamePasswordAuthenticationFilter)
    │   Extracts "Authorization: Bearer <token>"
    │   Calls JwtService.extractUsername()
    │   Calls CustomUserDetailsService.loadUserByUsername()
    │   Calls JwtService.isTokenValid()
    │   Sets SecurityContextHolder on success
    ▼
Spring Security Filter Chain
    │   /auth/**     → permitAll
    │   /**          → authenticated
    ▼
Controller
```

**SecurityConfig provides:**
- CSRF disabled (stateless API)
- CORS: all origins allowed (production should restrict)
- Session policy: `STATELESS` — no server-side sessions
- `DaoAuthenticationProvider` with `BCryptPasswordEncoder`
- `AuthenticationManager` bean exposed for `AuthService`

---

## MongoDB Data Model — `users` collection

```json
{
  "_id":          "ObjectId (string)",
  "username":     "string (unique index)",
  "email":        "string (unique index)",
  "passwordHash": "string (BCrypt)",
  "organization": "string (optional)",
  "projectIds":   ["string"] (empty list on creation),
  "createdAt":    "ISODate"
}
```

## MongoDB Data Model — `projects` collection

```json
{
  "_id":                "ObjectId (string)",
  "projectName":        "string",
  "description":        "string",
  "diagramUrl":         "string",
  "cloudinaryPublicId": "string",
  "status":             "string (enum: UPLOADING, REVIEWING, COMPLETED, FAILED)",
  "createdAt":          "ISODate",
  "updatedAt":          "ISODate"
}
```

## MongoDB Data Model — `project_chats` collection

```json
{
  "_id":        "ObjectId (string)",
  "projectId":  "string (indexed)",
  "senderType": "string (enum: USER, SYSTEM)",
  "message":    "string",
  "timestamp":  "ISODate"
}
```

## MongoDB Data Model — `agent_outputs` collection

```json
{
  "_id":       "ObjectId (string)",
  "projectId": "string (indexed)",
  "agentName": "string",
  "output":    "string",
  "createdAt": "ISODate"
}
```

## MongoDB Data Model — `review_reports` collection

```json
{
  "_id":              "ObjectId (string)",
  "projectId":        "string (unique index)",
  "overallScore":     "int",
  "grade":            "string",
  "summary":          "string",
  "criticalBlockers": ["string"],
  "priorityFixes":    ["string"],
  "recommendations":  ["string"],
  "createdAt":        "ISODate"
}
```

---

## What Is NOT Implemented Yet

- ❌ AI/LLM integration layer logic and endpoints
- ❌ Endpoints for Review Reports and Agent Outputs
- ❌ Token refresh / logout
- ❌ Role-based access (currently hardcoded `ROLE_USER`)
- ❌ Password reset / email verification
- ❌ Actuator endpoints secured
