# Development Rules

## General

- Use Java 21.
- Use Spring Boot 3.x.
- Use Maven.
- Follow Clean Architecture principles.
- Follow SOLID principles.
- Follow REST API best practices.

---

## Code Style

- Use constructor injection only.
- Never use field injection.
- Use Lombok where appropriate.
- Use meaningful class and variable names.
- Keep methods small and focused.
- Add JavaDoc for public classes and methods.

---

## Project Structure

Organize the backend using:

config/
controller/
service/
repository/
entity/
dto/
mapper/
exception/
security/
util/

---

## Database

- Use MongoDB Atlas.
- Use Spring Data MongoDB.
- Store passwords as BCrypt hashes.
- Never store plain text passwords.
- Create indexes for frequently searched fields.
- Use references instead of embedding large collections.

---

## Authentication

- Use JWT Authentication.
- Use Spring Security.
- Secure all APIs except:
    POST /auth/register
    POST /auth/login

---

## API Rules

- Use ResponseEntity.
- Use DTOs for request and response.
- Never expose Entity classes.
- Validate all incoming requests.

---

## Exception Handling

Implement a global exception handler.

Handle:

- Validation errors
- User already exists
- User not found
- Invalid credentials
- Project not found
- Unauthorized access

---

## Logging

Use SLF4J.

Do not use System.out.println().

---

## Testing

Write unit tests for:

- Services
- Controllers

Use JUnit 5 and Mockito.

---

## AI Agents

Every AI Agent must:

- Be an independent Spring Service.
- Return typed DTOs.
- Run asynchronously.
- Use Java Virtual Threads.
- Never directly call another agent.

Use an Orchestrator Service to coordinate all agents.

---

## Security

Never expose passwords.

Never log JWT tokens.

Validate ownership of every project before allowing access.

Users may only access their own projects.

---

## Git

One feature per commit.

Keep commits small and meaningful.

Do not commit secrets.

Ignore .env files.