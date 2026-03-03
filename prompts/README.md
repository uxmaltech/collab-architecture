# Prompts

Prompts here are authoritative instructions for Codex and Collab agents. They are versioned and must align with the canon.

## Directory Structure

- `init/` — Prompts for initial repository analysis during `collab init`
  - `system-prompt.md` — AI instructions for extracting architectural knowledge (axioms, ADRs, conventions, anti-patterns)
  - `user-prompt.md` — Reference for constructing user prompts with repository context

- `update/` — Prompts for AI-assisted canon updates when governance rules or schemas change
  - `system-prompt.md` — AI instructions for updating canon files while preserving user edits
  - `user-prompt.md` — Templates for specifying update requirements and validation criteria

- `agents/` — Agent prompts organized in two groups:

  **Phase agents** (aligned to [GOV-R-001](../governance/implementation-process.md)):
  - `phase-1-survey.md` — Explore codebase, find relevant files, check duplication, propose design
  - `phase-2-change-plan.md` — Produce ordered execution steps, file list, dependencies, risks
  - `phase-3-implementation.md` — Deliver code in small blocks with tests, eliminate duplication
  - `phase-4-repo-hygiene.md` — Audit abstractions, readability, doc maps, PR description
  - `phase-5-canon-sync.md` — Extract reusable learnings and update collab-architecture canon

  **Thematic agents** (cross-cutting, invoked by phase agents when conditions are met):
  - `architecture-reviewer.md` — Review proposals and code for canon compliance
  - `drift-detector.md` — Detect divergence between systems and canonical architecture
  - `pattern-extractor.md` — Extract reusable patterns from code into canon entries
  - `post-session-canon-update.md` — *(deprecated, superseded by `phase-5-canon-sync.md`)*

- `codex/` — Prompts for Codex integration
  - `codex-system.md` — System-level instructions for Codex
  - `codex-task.md` — Task-specific Codex prompts

## Two-Layer Agent Model

Phase agents are **mandatory and sequential** — they run in order (Phase 1 through 5) for every governed issue per GOV-R-001. They are the orchestration layer.

Thematic agents are **conditional and invocable** — they are triggered by phase agents when specific conditions are met during a phase. They are the specialization layer.

### Trigger Types

Each trigger between a phase agent and a thematic agent has a classification:

| Type | Meaning |
|------|---------|
| **MUST** | The phase agent is required to invoke the thematic agent when the condition is met. |
| **SHOULD** | The phase agent is expected to invoke the thematic agent when the condition is met, unless a documented reason justifies skipping it. |

### Cross-Reference Model

Triggers are declared in **both directions** for integrity checking:

1. **Phase prompts** include a `Thematic agent triggers:` section listing which thematic agents they may invoke and under what conditions.
2. **Thematic agent prompts** include a `Triggered by:` section listing which phases may invoke them and under what conditions.

This intentional redundancy ensures that if either side is updated without the other, the inconsistency is detectable.

### Trigger Map

| Thematic Agent | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|----------------|---------|---------|---------|---------|---------|
| `architecture-reviewer` | — | SHOULD | SHOULD | MUST | MUST |
| `drift-detector` | SHOULD | — | — | SHOULD | SHOULD |
| `pattern-extractor` | — | — | SHOULD | — | — |

## Usage

These prompts are read by `collab-cli` and other tooling at runtime. The `collab-cli` tool clones this repository to `~/.collab/canons/collab-architecture/` and reads prompts from there.

- `collab init` uses `init/system-prompt.md` for repository analysis
- `collab update-canons` uses `update/system-prompt.md` for structure updates
- Phase agents are used by contributors (human or AI) during the GOV-R-001 workflow

## Synchronization Rule

Per [GOV-R-001 Agent Prompt Synchronization](../governance/implementation-process.md#agent-prompt-synchronization), any PR that adds, updates, or removes a phase in GOV-R-001 MUST update the corresponding `agents/phase-{N}-{slug}.md` in the same PR.
