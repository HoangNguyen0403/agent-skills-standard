# C4 Model Reference

## 1. System Context Diagram

- **Scope**: Enterprise / System of Systems.
- **Elements**: People (Actors), Software Systems (Yours & External).
- **Goal**: Big picture. Who uses it? What does it integrate with?
- **Audience**: Everyone (Biz, PM, Dev).

## 2. Container Diagram

- **Scope**: Single System.
- **Elements**: Containers (Web App, Mobile App, API, DB, File Store, Microservice).
- **Not Docker**: "Container" = deployable unit (e.g., WAR file, JAR, SPA).
- **Goal**: Tech stack choices. How do containers talk?
- **Audience**: Technical (Architects, Devs, Ops).

## 3. Component Diagram

- **Scope**: Single Container.
- **Elements**: Components (Controller, Service, Repository), Modules.
- **Goal**: Code organization and dependencies.
- **Audience**: Developers.

## 4. Code Diagram (Optional)

- **Scope**: Single Component.
- **Elements**: Classes, Interfaces.
- **Goal**: Implementation details. Usually generated (e.g., ERD).
