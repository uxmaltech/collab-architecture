# Prompts

Prompts here are authoritative instructions for agents operating within the Collab ecosystem. They are versioned and must align with the canon.

## Directory Structure

- `init/` — Prompts for initial repository analysis during `collab init`
  - `system-prompt.md` — AI instructions for extracting architectural knowledge (axioms, ADRs, conventions, anti-patterns)
  - `user-prompt.md` — Reference for constructing user prompts with repository context

- `update/` — Prompts for AI-assisted canon updates when governance rules or schemas change
  - `system-prompt.md` — AI instructions for updating canon files while preserving user edits
  - `user-prompt.md` — Templates for specifying update requirements and validation criteria

- `agents/` — Agent prompts organized in two groups:

  **Epic Lifecycle agents** (aligned to [GOV-R-001](../governance/epic-lifecycle.md)):
  - `epic-phase-1-discovery.md` — Structured interview + MCP research → Epic Brief
  - `epic-phase-2-epic-creation.md` — Create Epic Issue in business repo with human approval
  - `epic-phase-3-story-decomposition.md` — Decompose Epic into Story Issues per repository

  **Implementation agents** (aligned to [GOV-R-002](../governance/implementation-process.md)):
  - `impl-phase-1-survey-and-plan.md` — Explore codebase, check duplication, propose design, produce execution plan
  - `impl-phase-2-implementation.md` — Deliver code in small blocks with tests, eliminate duplication
  - `impl-phase-3-repo-hygiene.md` — Audit abstractions, readability, doc maps, PR description

  **Canon Sync agent** (aligned to [GOV-R-003](../governance/canon-sync.md)):
  - `canon-sync.md` — Extract reusable learnings and update collab-architecture canon

  **Thematic agents** (cross-cutting, invoked by process agents when conditions are met):
  - `architecture-reviewer.md` — Review proposals and code for canon compliance
  - `drift-detector.md` — Detect divergence between systems and canonical architecture
  - `pattern-extractor.md` — Extract reusable patterns from code into canon entries
  - `post-session-canon-update.md` — *(deprecated, superseded by `canon-sync.md`)*

- `codex/` — Prompts for Codex integration
  - `codex-system.md` — System-level instructions for Codex
  - `codex-task.md` — Task-specific Codex prompts

## Three-Process Agent Model

Agents are organized around the three governance processes that form the Collab development lifecycle:

```
GOV-R-001 (Epic Lifecycle) → GOV-R-002 (Implementation) → GOV-R-003 (Canon Sync)
```

### Process agents

**GOV-R-001 — Epic Lifecycle** agents are driven by the Discovery Agent (LLM via collab-core-pkg). They operate conversationally to understand, plan, and decompose work before any code is written.

**GOV-R-002 — Implementation** agents are executed by compatible agents (Codex, Claude Code, GitHub Copilot) operating on GitHub issues. They follow the sequential phases of survey, implementation, and hygiene.

**GOV-R-003 — Canon Sync** agent runs after implementation is merged. It captures reusable architectural learnings into the canon.

### Thematic agents

Thematic agents are **conditional and invocable** — they are triggered by process agents when specific conditions are met. They are the specialization layer that provides cross-cutting expertise.

### Trigger Types

Each trigger between a process agent and a thematic agent has a classification:

| Type | Meaning |
|------|---------|
| **MUST** | The process agent is required to invoke the thematic agent when the condition is met. |
| **SHOULD** | The process agent is expected to invoke the thematic agent when the condition is met, unless a documented reason justifies skipping it. |

### Cross-Reference Model

Triggers are declared in **both directions** for integrity checking:

1. **Process agent prompts** include a `Thematic agent triggers:` section listing which thematic agents they may invoke and under what conditions.
2. **Thematic agent prompts** include a `Triggered by:` section listing which processes may invoke them and under what conditions.

This intentional redundancy ensures that if either side is updated without the other, the inconsistency is detectable.

### Trigger Map

| Thematic Agent | GOV-R-001 | GOV-R-002 | GOV-R-003 |
|---|---|---|---|
| | Ph1 Discovery | Ph2 Epic | Ph3 Stories | Ph1 Survey&Plan | Ph2 Impl | Ph3 Hygiene | Canon Sync |
| `architecture-reviewer` | SHOULD | — | — | SHOULD | SHOULD | MUST | MUST |
| `drift-detector` | SHOULD | — | SHOULD | SHOULD | — | SHOULD | SHOULD |
| `pattern-extractor` | — | — | — | — | SHOULD | — | — |

## Usage

These prompts are read by `collab-cli` and other tooling at runtime. The `collab-cli` tool clones this repository to `~/.collab/canons/collab-architecture/` and reads prompts from there.

- `collab init` uses `init/system-prompt.md` for repository analysis
- `collab update-canons` uses `update/system-prompt.md` for structure updates
- Epic agents are used by the Discovery Agent (LLM in collab-laravel-app) during the GOV-R-001 workflow
- Implementation agents are used by contributors (Codex, Claude Code, GitHub Copilot) during the GOV-R-002 workflow
- Canon Sync agent is used after merges per GOV-R-003

## Synchronization Rules

Per governance, any PR that modifies a process phase MUST update the corresponding agent prompt in the same PR:

- [GOV-R-001](../governance/epic-lifecycle.md) phases → `agents/epic-phase-{N}-{slug}.md`
- [GOV-R-002](../governance/implementation-process.md) phases → `agents/impl-phase-{N}-{slug}.md`
- [GOV-R-003](../governance/canon-sync.md) steps → `agents/canon-sync.md`
