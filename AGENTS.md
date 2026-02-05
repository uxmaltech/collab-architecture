# Repository Guidelines

## Purpose & Scope
Collab Architecture is the canonical architectural memory for UxmalTech. This repo stores enforceable architecture rules, decisions, and contracts; it does not contain application code. Changes should be atomic, reusable, and governed by the review process in `governance/`.

## Project Structure & Module Organization
- `schema/` JSON/YAML schemas that validate canon entries, graph nodes, and vector records.
- `domains/` domain-specific rules, patterns, and anti-patterns (primarily Markdown).
- `knowledge/` global axioms, conventions, decisions, and anti-patterns.
- `graph/` graph schemas plus `graph/seed/` NGQL seeds.
- `embeddings/` ingestion sources and scripts for vector payloads.
- `contracts/` cross-layer and UI contract YAML.
- `prompts/`, `evolution/`, `governance/`, `infra/` for agent prompts, changelog, governance docs, and Nebula/Qdrant infra.

## Build, Test, and Development Commands
Requires Docker and Python 3.
- `make status` shows Qdrant/Nebula container status.
- `make db-up` / `make db-down` start or stop Qdrant + NebulaGraph.
- `make seed-embeddings` builds vector payloads and seeds Qdrant.
- `make seed-graph` loads NebulaGraph schema + data.
- `make seed` runs both seeding flows.
- `make update` refreshes embeddings and graph data without resetting schema.
- `make tools-up` starts databases plus the local MCP server for technical and business context tools.
- `make tools-down` stops the MCP server started by `make tools-up`.
- `make tools-config` writes MCP client config to `~/.codex/config.toml` (prompts before overwrite).
- Example Codex config snippet lives at `tools/mcp-collab/codex-config.example.toml`.
- `make logs-qdrant` / `make logs-nebula` stream container logs.

## Seeding Behavior (Do Not Change)
This repo has a deliberate separation between bootstrap and update flows. Avoid "improving" this unless you also update governance docs and verify with Nebula/Qdrant.
- `make seed` is the bootstrap path. It recreates the Nebula schema (via `graph/seed/schema.ngql`) and then loads data (`graph/seed/data.ngql`). This is destructive by design.
- `make update` is the safe update path. It assumes the schema already exists and only reloads data from `graph/seed/data.ngql` plus embeddings.
- `graph/seed/seed.ngql` is a standalone, all-in-one script (schema + data) intended for manual full resets. It is not used by `make update`.

## MCP Contexts
- Technical canon tools: `architecture.graph.query` and `architecture.vector.search` (aliases: `graph.query`, `vector.search`). Uses space `collab_architecture` and collection `collab-architecture-canon`.
- Business context tools: `business.graph.query`, `business.vector.search`, and `business.rule` (ingests Markdown). Uses space `business_architecture` and collection `business-architecture-canon`.

## Coding Style & Naming Conventions
- Use `kebab-case` filenames with stable IDs, e.g., `knowledge/axioms/AX-001-authoritative-canon.md`.
- Canon entries must include IDs, status, dates, and domain references as required by `schema/*.schema.yaml`.
- YAML uses 2-space indentation; Python uses 4-space indentation; keep Markdown headings clear and ID-forward.
- Use enforceable language for rules (MUST/SHALL), and keep entries scoped to one rule or decision.

## Testing & Validation
There is no automated test runner. Validate changes by:
- Running `make seed` (or `make seed-embeddings` / `make seed-graph`) to ensure ingestion and graph seeds load.
- Ensuring new/updated entries satisfy schema rules in `schema/`.
- Recording canon changes in `evolution/changelog.md` with IDs and dates.

## Commit & Pull Request Guidelines
- Commit messages are short and imperative; canon updates often use a `Canon: ...` prefix (example: `Canon: add CQRS routing rule`).
- PRs should include a clear summary, rationale, and the list of IDs/files touched. Link issues when applicable, and update `evolution/changelog.md`.
- Follow the governance review process in `governance/review-process.md` before merging.
