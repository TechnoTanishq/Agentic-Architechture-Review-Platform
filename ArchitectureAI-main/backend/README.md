# ArchitectureAI Backend API Specification

This document provides a comprehensive OpenAPI-style specification for all REST endpoints in the ArchitectureAI backend.

## Base URL
`http://localhost:8080/api/v1` (or as configured)

## Sections
- [Authentication](#authentication)
- [Users](#users)
- [Projects](#projects)
- [Chats](#chats)
- [Uploads](#uploads)
- [Reports](#reports)
- [Agent Execution](#agent-execution)
- [Health](#health)
- [Actuator](#actuator)

---

## Authentication

### `POST /auth/register`
Register a new user.

- **Authentication Required:** No
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepassword",
    "organization": "TechCorp"
  }
  ```
- **Response Body:**
  ```json
  {
    "token": "eyJhbG...",
    "type": "Bearer",
    "username": "johndoe",
    "email": "john@example.com",
    "organization": "TechCorp"
  }
  ```
- **HTTP Status Codes:**
  - `201 Created`: Registration successful
  - `400 Bad Request`: Validation failed
  - `409 Conflict`: Username or email already exists
- **Validation Rules:**
  - `username`: 3-50 chars, required
  - `email`: valid email format, required
  - `password`: min 6 chars, required
- **Possible Errors:**
  - `UserAlreadyExistsException`

### `POST /auth/login`
Authenticate user and return JWT.

- **Authentication Required:** No
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "username": "johndoe",
    "password": "securepassword"
  }
  ```
- **Response Body:**
  ```json
  {
    "token": "eyJhbG...",
    "type": "Bearer",
    "username": "johndoe",
    "email": "john@example.com",
    "organization": "TechCorp"
  }
  ```
- **HTTP Status Codes:**
  - `200 OK`: Authentication successful
  - `400 Bad Request`: Validation failed
  - `401 Unauthorized`: Invalid credentials
- **Validation Rules:**
  - `username`: required (can be email or username)
  - `password`: required
- **Possible Errors:**
  - `InvalidCredentialsException`

---

## Users

### `GET /users/me`
Retrieve the currently authenticated user's profile.

- **Authentication Required:** Yes (Bearer Token)
- **Request Headers:** `Authorization: Bearer <token>`
- **Request Body:** None
- **Response Body:**
  ```json
  {
    "id": "64abc123...",
    "username": "johndoe",
    "email": "john@example.com",
    "organization": "TechCorp",
    "createdAt": "2023-10-27T10:00:00Z"
  }
  ```
- **HTTP Status Codes:**
  - `200 OK`: Successful
  - `401 Unauthorized`: Missing or invalid token
- **Validation Rules:** N/A
- **Possible Errors:** None

---

## Projects

### `POST /projects`
Create a new project.

- **Authentication Required:** Yes (Bearer Token)
- **Request Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "projectName": "New Architecture",
    "description": "A microservices design."
  }
  ```
- **Response Body:**
  ```json
  {
    "id": "proj123...",
    "projectName": "New Architecture",
    "description": "A microservices design.",
    "status": "UPLOADING",
    "createdAt": "2023-10-27T10:05:00Z",
    "updatedAt": "2023-10-27T10:05:00Z"
  }
  ```
- **HTTP Status Codes:**
  - `201 Created`: Project created successfully
  - `400 Bad Request`: Validation failed
  - `401 Unauthorized`: Invalid token
- **Validation Rules:**
  - `projectName`: 1-100 chars, required
  - `description`: max 1000 chars
- **Possible Errors:** None

### `GET /projects`
Retrieve all projects for the user.

- **Authentication Required:** Yes (Bearer Token)
- **Request Headers:** `Authorization: Bearer <token>`
- **Request Body:** None
- **Response Body:** Array of Project objects
- **HTTP Status Codes:**
  - `200 OK`: Successful
  - `401 Unauthorized`: Invalid token

### `GET /projects/{projectId}`
Retrieve a single project by ID.

- **Authentication Required:** Yes (Bearer Token)
- **Request Headers:** `Authorization: Bearer <token>`
- **Request Body:** None
- **Response Body:** Project object
- **HTTP Status Codes:**
  - `200 OK`: Successful
  - `401 Unauthorized`: Invalid token
  - `403 Forbidden`: User does not own this project
  - `404 Not Found`: Project not found

### `PUT /projects/{projectId}`
Update an existing project.

- **Authentication Required:** Yes (Bearer Token)
- **Request Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "projectName": "Updated Name",
    "description": "Updated description."
  }
  ```
- **Response Body:** Updated Project object
- **HTTP Status Codes:**
  - `200 OK`: Successful
  - `401 Unauthorized`: Invalid token
  - `403 Forbidden`: User does not own this project
  - `404 Not Found`: Project not found

### `DELETE /projects/{projectId}`
Delete a project.

- **Authentication Required:** Yes (Bearer Token)
- **Request Headers:** `Authorization: Bearer <token>`
- **Request Body:** None
- **Response Body:** None
- **HTTP Status Codes:**
  - `204 No Content`: Successfully deleted
  - `401 Unauthorized`: Invalid token
  - `403 Forbidden`: User does not own this project
  - `404 Not Found`: Project not found

---

## Uploads

### `POST /projects/{projectId}/upload`
Upload architecture diagram for a project.

- **Authentication Required:** Yes (Bearer Token)
- **Request Headers:** `Content-Type: multipart/form-data`, `Authorization: Bearer <token>`
- **Request Body:** Form data with `file` part (MultipartFile)
- **Response Body:** Updated Project object (status changed to REVIEWING)
  ```json
  {
    "id": "proj123...",
    "projectName": "New Architecture",
    "diagramUrl": "https://res.cloudinary.com/...",
    "cloudinaryPublicId": "abc_123",
    "status": "REVIEWING"
  }
  ```
- **HTTP Status Codes:**
  - `200 OK`: Upload successful
  - `401 Unauthorized`: Invalid token
  - `403 Forbidden`: User does not own this project
  - `500 Internal Server Error`: Upload to Cloudinary failed

---

## Chats

### `POST /projects/{projectId}/chat`
Send a chat message for a project.

- **Authentication Required:** Yes (Bearer Token)
- **Request Headers:** `Content-Type: application/json`, `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "message": "Is the DB highly available?"
  }
  ```
- **Response Body:**
  ```json
  {
    "id": "msg123...",
    "projectId": "proj123...",
    "senderType": "USER",
    "message": "Is the DB highly available?",
    "timestamp": "2023-10-27T10:10:00Z"
  }
  ```
- **HTTP Status Codes:**
  - `201 Created`: Message sent
  - `401 Unauthorized`: Invalid token
  - `403 Forbidden`: User does not own this project

### `GET /projects/{projectId}/chat`
Retrieve chat history with pagination.

- **Authentication Required:** Yes (Bearer Token)
- **Request Headers:** `Authorization: Bearer <token>`
- **URL Parameters:** `page`, `size`, `sort` (optional)
- **Response Body:** Page of message objects
- **HTTP Status Codes:**
  - `200 OK`: Successful
  - `401 Unauthorized`: Invalid token
  - `403 Forbidden`: User does not own this project

---

## Reports
*Note: REST API endpoints for fetching final Review Reports are pending implementation.*

Expected behavior once implemented:
- Retrieve the final `ReviewReport` for a project, containing overall score, grade, summary, and lists of critical blockers/recommendations.

---

## Agent Execution
*Note: REST API endpoints for managing or querying Agent Execution are pending implementation.*

Expected behavior once implemented:
- Query `AgentOutput` entities to view partial analysis results from individual specialist agents.

---

## Health
### `GET /actuator/health`
Standard Spring Boot health check endpoint.

- **Authentication Required:** No (if exposed publicly)
- **Response Body:**
  ```json
  {
    "status": "UP"
  }
  ```
- **HTTP Status Codes:**
  - `200 OK`: Application is healthy

---

## Actuator
Spring Boot Actuator endpoints for monitoring and management (e.g., `/actuator/info`, `/actuator/metrics`). Security configuration for these is pending review.
