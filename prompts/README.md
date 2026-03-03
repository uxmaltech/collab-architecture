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

  **Thematic agents** (cross-cutting, invoked by phase agents or independently):
  - `architecture-reviewer.md` — Review proposals and code for canon compliance
  - `drift-detector.md` — Detect divergence between systems and canonical architecture
  - `pattern-extractor.md` — Extract reusable patterns from code into canon entries
  - `post-session-canon-update.md` — Update canon with learnings after development sessions

- `codex/` — Prompts for Codex integration
  - `codex-system.md` — System-level instructions for Codex
  - `codex-task.md` — Task-specific Codex prompts

## Usage

These prompts are read by `collab-cli` and other tooling at runtime. The `collab-cli` tool clones this repository to `~/.collab/canons/collab-architecture/` and reads prompts from there.

- `collab init` uses `init/system-prompt.md` for repository analysis
- `collab update-canons` uses `update/system-prompt.md` for structure updates
- Phase agents are used by contributors (human or AI) during the GOV-R-001 workflow

## Synchronization Rule

Per [GOV-R-001 Agent Prompt Synchronization](../governance/implementation-process.md#agent-prompt-synchronization), any PR that adds, updates, or removes a phase in GOV-R-001 MUST update the corresponding `agents/phase-{N}-{slug}.md` in the same PR.
