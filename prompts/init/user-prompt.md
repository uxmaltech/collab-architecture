# Initial Repository Analysis User Prompt Reference

This document describes how to construct the user prompt for initial repository analysis during `collab init`.

## Purpose

The user prompt provides context about the repository being analyzed, including:
- Repository location and structure
- Specific areas to focus on
- Known architectural patterns to look for
- Files or directories to prioritize or exclude

## Prompt Template

```
Analyze the repository at: <path>

Focus areas:
- <specific domain or module to emphasize>
- <technology stack details>
- <known patterns or frameworks in use>

Exclude:
- <directories to skip, e.g., node_modules, vendor, dist>
- <generated code or build artifacts>

Additional context:
<Any relevant background about the project, team conventions, or architectural goals>
```

## Example Prompts

### Minimal Example
```
Analyze the repository at: /workspace/my-project

Focus on backend services and API design patterns.
```

### Comprehensive Example
```
Analyze the repository at: /workspace/enterprise-app

Focus areas:
- Backend services using NestJS and TypeScript
- GraphQL API layer with custom resolvers
- Event-driven architecture using RabbitMQ
- Monorepo structure with multiple packages

Exclude:
- node_modules, dist, coverage
- .next and .cache directories
- Generated GraphQL types

Additional context:
This is a CQRS-based enterprise application with strict separation between
command and query models. The team follows Domain-Driven Design principles
and uses Event Sourcing for audit trails. Look for bounded contexts in the
services/ directory.
```

### Domain-Specific Example
```
Analyze the repository at: /workspace/ecommerce-platform

Focus areas:
- Payment processing module (services/payments/)
- Order management domain (services/orders/)
- Inventory synchronization patterns
- Authentication and authorization mechanisms

Known patterns:
- Saga pattern for distributed transactions
- CQRS with separate read/write models
- Event-driven communication between services

Additional context:
The codebase follows hexagonal architecture. Domain logic lives in core/
directories, adapters live in infrastructure/ directories.
```

## Construction Guidelines

1. **Path**: Always provide the absolute or relative path to the repository
2. **Focus Areas**: List 2-5 specific modules, domains, or architectural aspects
3. **Exclusions**: Explicitly exclude common non-source directories to save analysis time
4. **Context**: Provide any team-specific conventions or known architectural patterns
5. **Specificity**: Be concrete—mention specific frameworks, libraries, or patterns in use

## What NOT to Include

- Implementation details or business logic specifics
- Individual function or class names (unless they represent patterns)
- Temporary TODOs or incomplete features
- Personal preferences unrelated to architecture

## Advanced Options

### Targeted Re-analysis
If running `collab init` again on an existing canon, you can focus on specific areas:

```
Re-analyze authentication and authorization patterns in: /workspace/my-app

Focus areas:
- services/auth/ module
- middleware/ directory
- JWT token handling

Skip previously analyzed:
- Data access patterns
- UI components
```

### Multi-repository Analysis
For monorepos or multi-service projects:

```
Analyze the monorepo at: /workspace/platform

Repositories to analyze:
- packages/api (NestJS backend)
- packages/web (Next.js frontend)
- packages/shared (shared utilities)

Treat each package as a separate domain with cross-cutting concerns documented
in the shared package.
```

## Tips for Effective Prompts

- **Be specific about frameworks**: Mention React, Angular, NestJS, Spring Boot, etc.
- **Indicate architectural style**: Mention microservices, monolith, serverless, etc.
- **List key technologies**: Databases, message queues, caching layers
- **Note team conventions**: If the team has documented standards, reference them
- **Provide context, not instructions**: The system prompt handles "how to analyze"

## Integration with `collab-cli`

The `collab init` command will:
1. Read this reference to understand prompt structure
2. Prompt the user for repository path and optional focus areas
3. Construct the full user prompt using the provided information
4. Combine it with `system-prompt.md` to send to the AI model
5. Process the JSON response to generate initial canon files
