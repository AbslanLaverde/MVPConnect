## DTO Package Structure

This package contains Data Transfer Objects for API communication.

### Subdirectories:

- **request/** - DTOs for incoming API requests (login, signup, create, update)
- **response/** - DTOs for API responses (user data, success/error messages)

### Purpose:
- Separate API layer from domain model (Neo4j nodes)
- Validate input data
- Control what data is exposed to clients
- Version API contracts independently from database schema

