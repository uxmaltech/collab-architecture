# Repository Guidelines

## Purpose & Scope

Collab Architecture is the canonical architectural memory for UxmalTech. This repo stores enforceable architecture rules, decisions, and contracts; it does not contain application code. Changes should be atomic, reusable, and governed by the review process in `governance/`.

Governing rule: "If it is not in Collab Architecture, it is not a rule yet."

This repo is **agnostic** to any specific application or business canon — it does not reference or depend on application-level architecture repos.

## Ecosystem Context

| Repository | Role | Relation |
|---|---|---|
| `collab-architecture` (this repo) | Framework canon — single source of truth | Defines rules, patterns, decisions |
| `collab-cli` | Orchestrator CLI | Syncs canon, scaffolds repos, manages infra |
| `collab-architecture-mcp` | MCP server | Exposes canon as graph + vectors to AI agents |
| Application canons | Business canon repos | Separate, configurable repos that inherit from framework |

## Project Structure

```
knowledge/          → Axioms (AX-###), decisions (ADR-###), conventions (CN-###), anti-patterns (AP-###)
domains/            → Domain-specific rules, patterns, anti-patterns, glossaries
  backend-cbq/      → CBQ rules (CBQ-R-###), patterns (CBQ-PAT-###)
  backoffice-ui/    → BOUI rules (BO-R-###), patterns (BO-PAT-###)
  cross-layer/      → Cross-layer rules (CL-R-###), patterns (CL-PAT-###)
contracts/          → Versioned UI↔backend contracts (UIC-###)
graph/              → NebulaGraph schemas and seed data (seed/)
schema/             → Validation schemas (graph, vector, contracts, version)
embeddings/         → Ingestion configuration and vector sources
prompts/            → Agent prompts: epic lifecycle, implementation, canon sync, thematic
governance/         → GOV-R-001, GOV-R-002, GOV-R-003, review process, admission criteria
evolution/          → Changelog, deprecations, migration guides, upgrade guide
```

## Governance — Three-Process Lifecycle

Every change follows the governance lifecycle:

```
GOV-R-001 (Epic Lifecycle) → GOV-R-002 (Implementation) → GOV-R-003 (Canon Sync)
```

### GOV-R-001 — Epic Lifecycle
Discovery → Epic Creation → Story Decomposition. Driven by the Discovery Agent (LLM via collab-core-pkg). Creates Story Issues that feed into GOV-R-002.

### GOV-R-002 — Implementation Process
Survey & Change Plan → Implementation → Repo Hygiene. Executed by compatible agents (Codex, Claude Code, GitHub Copilot) on GitHub issues. Trivial fixes MAY skip Phase 1 but MUST follow Phase 2 and Phase 3.

### GOV-R-003 — Canon Sync
After merge, evaluate whether reusable architectural learnings should be captured. If yes, extract, deduplicate, write, validate, and commit canon entries.

## ID System

| Pattern | Type | Example |
|---------|------|---------|
| `AX-###` | Axiom | AX-001 Authoritative Canon |
| `ADR-###` | Architectural decision | ADR-006 Collab AI-Assisted Platform |
| `CN-###` | Convention | CN-001 Canonical Naming |
| `AP-###` | Global anti-pattern | AP-001 Architecture in Code |
| `DOM-###` | Domain | DOM-001 Backoffice UI |
| `{DOMAIN}-R-###` | Domain rule | BO-R-001, CBQ-R-003 |
| `{DOMAIN}-PAT-###` | Domain pattern | BO-PAT-001, CBQ-PAT-003 |
| `UIC-###` | UI contract | UIC-001 GridJS List Endpoint |
| `TECH-###` | Technology | TECH-001 PHP |
| `GOV-R-###` | Governance rule | GOV-R-001 Epic Lifecycle |

## Coding Style & Naming Conventions

- Use `kebab-case` filenames with stable IDs, e.g., `knowledge/axioms/AX-001-authoritative-canon.md`.
- Canon entries must include IDs, status, dates, and domain references as required by `schema/*.schema.yaml`.
- YAML uses 2-space indentation; keep Markdown headings clear and ID-forward.
- Use enforceable language for rules (MUST/SHALL), and keep entries scoped to one rule or decision.
- All canon entries MUST be in English. No translations, localized variants, or bilingual files are permitted.
- `.md` files are always canonical; NebulaGraph and Qdrant indexes are derived artifacts.
- Confidence levels: `experimental`, `provisional`, `verified`, `deprecated`.

## Testing & Validation

There is no automated test runner. Validate changes by:
- Ensuring new/updated entries satisfy schema rules in `schema/`.
- Recording canon changes in `evolution/changelog.md` with IDs and dates.
- Verifying graph seeds load correctly via `collab-architecture-mcp` tooling.

## Commit & Pull Request Guidelines

- Commit messages are short and imperative; canon updates use a `Canon: ...` prefix.
- PRs should include a clear summary, rationale, and the list of IDs/files touched.
- Link issues when applicable and update `evolution/changelog.md`.
- Follow the governance review process in `governance/review-process.md` before merging.

## Language Policy
- All documentation, README files, code comments, and canon entries MUST be written in English.
- No translations, localized variants, or bilingual files are permitted in any UxmalTech repository.
- This includes ALL generated content: templates, CI workflows, issue bodies, PR descriptions, error messages, log messages, and string literals in code.
- AI-generated content (commits, PRs, issues, code) MUST also be in English — no exceptions.

## Do Not

- Add application-specific rules here — those belong in the application's own canon repo.
- Reference any specific application canon repo by name.
- Embed code from application repositories.
- Duplicate canon entries across domains.
- Skip `evolution/changelog.md` updates.

## GitHub Issue Closing Rule
- When a pull request fully completes a GitHub issue, the PR description MUST include `Closes #<issue-number>`.
- `Refs #<issue-number>` MAY be used for related work, but it MUST NOT be the only issue reference when the intent is to close the issue automatically.
- If a pull request is intentionally partial and should leave the issue open, use `Refs #<issue-number>` instead of `Closes #<issue-number>`.

