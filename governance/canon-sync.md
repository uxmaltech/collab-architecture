# GOV-R-003 Canon Sync

ID: GOV-R-003
Status: active
Confidence: verified
Created: 2026-03-04

After a PR governed by GOV-R-002 is merged, the contributor MUST evaluate whether reusable architectural learnings should be captured in the canon. This process ensures that knowledge gained during implementation is preserved as enforceable, product-agnostic rules.

## Lifecycle Context

```
GOV-R-001 (Epic Lifecycle) → GOV-R-002 (Implementation) → GOV-R-003 (Canon Sync)
```

This process runs after implementation is complete and merged.

## Compatible Agents

- **Codex (OpenAI)** — agent CLI with multi-file editing capabilities.
- **Claude Code (Anthropic)** — agent CLI with deep analysis capabilities.
- **GitHub Copilot** — additional option: native GitHub agent. Low-cost, suitable for straightforward canon updates.

## Step 1 — Extract Candidates

Review the implementation for recurring patterns, invariants, implicit contracts, and new domain rules. Categorize into:
- **Domain rules** — enforceable MUST/MUST NOT statements.
- **Patterns** — repeatable solutions with constraints.
- **Decisions (ADR)** — when tradeoffs exist.
- **Cross-layer contracts (UIC)** — when UI↔backend shapes are implied.

## Step 2 — Deduplicate

Search the canon for existing entries that already cover the learning. If an existing entry covers it, update that entry instead of creating a duplicate.

## Step 3 — Write Canonical Entries

Place rules and patterns under the most specific domain folder (`domains/backend-cbq/`, `domains/backoffice-ui/`, `domains/cross-layer/`, `knowledge/`). Each entry MUST have a stable ID, status, use enforceable language (MUST/MUST NOT/MAY), avoid implementation-specific details, and include consequences.

## Step 4 — Alignment Check

Before committing, verify internal consistency of the canon:
- No ID collisions within any category (axioms, decisions, conventions, rules, patterns, anti-patterns, contracts).
- All new entries include required fields per their category template (ID, Status, Confidence, date).
- New graph nodes have corresponding entries in `graph/seed/` with valid edge types per `schema/graph.schema.yaml`.
- Cross-domain references exist where rules impose obligations on other domains.
- Index files (`README.md`, `knowledge/README.md`, `domains/README.md`, `prompts/README.md`) reflect the new entries.
- `embeddings/sources.yaml` covers all new file paths.
- `evolution/changelog.md` documents the change with correct date ordering.
- `evolution/deprecated.md` is updated if any entry is deprecated.

## Step 5 — Contracts

If the implementation introduced or changed UI↔backend response shapes or command outcome shapes, create or update a contract in `/contracts` with semver versioning. State guarantees and invariants explicitly.

## Step 6 — Validate and Commit

Replace product-specific nouns with technology-level terms: "entity/table" instead of specific table names, "business data store" instead of a specific database name. Verify no product-specific names, URLs, customer names, hostnames, or environment-specific details leaked into the canon. Commit with a message prefixed by `Canon:`.

## Skip Clause

This process MAY be skipped if the implementation introduced no reusable architectural learnings. The contributor MUST explicitly state that GOV-R-003 was evaluated and found unnecessary.

## Relationship to Review Process

Canon entries created during this process follow the review process defined in [governance/review-process.md](review-process.md).

## Agent Prompt Synchronization

The steps defined in this document MUST have a corresponding agent prompt at `prompts/agents/canon-sync.md`. A PR that modifies steps without updating the prompt MUST NOT be merged.

## Scope

This process applies after any merge in a repository governed by collab-architecture. It applies to both framework canon and business canon repositories.
