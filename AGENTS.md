# Repository Guidelines

## Purpose & Scope
Collab Architecture is the canonical architectural memory for UxmalTech. This repo stores enforceable architecture rules, decisions, and contracts; it does not contain application code. Changes should be atomic, reusable, and governed by the review process in `governance/`.

## Project Structure & Module Organization
- `schema/` JSON/YAML schemas that validate canon entries, graph nodes, and vector records.
- `domains/` domain-specific rules, patterns, and anti-patterns (primarily Markdown).
- `knowledge/` global axioms, conventions, decisions, and anti-patterns.
- `graph/` graph schemas plus `graph/seed/` NGQL seeds.
- `contracts/` cross-layer and UI contract YAML.
- `prompts/`, `evolution/`, `governance/` for agent prompts, changelog, and governance docs.

## MCP Server & Operational Tooling
The MCP server and all operational tooling (database management, ingestion pipelines, Docker infrastructure) have been extracted to [`uxmaltech/collab-architecture-mcp`](https://github.com/uxmaltech/collab-architecture-mcp). Refer to that repository for:
- Starting/stopping Qdrant and NebulaGraph services.
- Seeding graph and vector data.
- Running the MCP context server.
- GitHub ingestion and V2 vector scoping.

## Coding Style & Naming Conventions
- Use `kebab-case` filenames with stable IDs, e.g., `knowledge/axioms/AX-001-authoritative-canon.md`.
- Canon entries must include IDs, status, dates, and domain references as required by `schema/*.schema.yaml`.
- YAML uses 2-space indentation; Python uses 4-space indentation; keep Markdown headings clear and ID-forward.
- Use enforceable language for rules (MUST/SHALL), and keep entries scoped to one rule or decision.

## Testing & Validation
There is no automated test runner. Validate changes by:
- Ensuring new/updated entries satisfy schema rules in `schema/`.
- Recording canon changes in `evolution/changelog.md` with IDs and dates.
- Verifying graph seeds load correctly via `collab-architecture-mcp` tooling.

## Implementation Process (GOV-R-001)
Every issue MUST [GOV-R-001] follow the five-phase process defined in `governance/implementation-process.md` (Survey, Change Plan, Implementation, Canon Sync, Repo Hygiene). Trivial fixes may skip Survey and Change Plan but must still follow Implementation, Canon Sync, and Repo Hygiene.

## Commit & Pull Request Guidelines
- Commit messages are short and imperative; canon updates often use a `Canon: ...` prefix (example: `Canon: add CQRS routing rule`).
- PRs should include a clear summary, rationale, and the list of IDs/files touched. Link issues when applicable, and update `evolution/changelog.md`.
- Follow the governance review process in `governance/review-process.md` before merging.
