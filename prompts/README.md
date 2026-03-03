# Prompts

Prompts here are authoritative instructions for Codex and Collab agents. They are versioned and must align with the canon.

## Directory Structure

- `init/` — Prompts for initial repository analysis during `collab init`
  - `system-prompt.md` — AI instructions for extracting architectural knowledge (axioms, ADRs, conventions, anti-patterns)
  - `user-prompt.md` — Reference for constructing user prompts with repository context

- `update/` — Prompts for AI-assisted canon updates when governance rules or schemas change
  - `system-prompt.md` — AI instructions for updating canon files while preserving user edits
  - `user-prompt.md` — Templates for specifying update requirements and validation criteria

- `agents/` — Agent-specific prompts for architecture analysis and maintenance
  - `architecture-reviewer.md` — Code review from architectural perspective
  - `drift-detector.md` — Detect divergence from canon
  - `pattern-extractor.md` — Extract reusable patterns from code
  - `post-session-canon-update.md` — Update canon after development sessions

- `codex/` — Prompts for Codex integration
  - `codex-system.md` — System-level instructions for Codex
  - `codex-task.md` — Task-specific Codex prompts

## Usage

These prompts are read by `collab-cli` and other tooling at runtime. The `collab-cli` tool clones this repository to `~/.collab/canons/collab-architecture/` and reads prompts from there.

- `collab init` uses `init/system-prompt.md` for repository analysis
- Future `collab update-canons` command will use `update/system-prompt.md` for structure updates
