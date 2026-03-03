# GOV-R-001 Implementation Process

ID: GOV-R-001
Status: active
Confidence: verified
Created: 2026-03-02

Every issue in a repository governed by collab-architecture MUST [GOV-R-001] follow this five-phase process before merging. The contributor (human or agent) acts as Staff Engineer responsible for architectural coherence of the target repository.

## Phase 1 — Survey

Before writing any code, post a comment on the issue with:

1. **Relevant files and modules.** List files in the repo where related logic already exists or should live. The survey MUST be thorough: search across directory structures, grep for related identifiers, and trace import chains. The goal is to leave no relevant file undiscovered, not to hit a specific count.
2. **Duplication check.** Identify any existing logic that overlaps with the issue scope. If context is missing, propose how to locate what exists before assuming. Invest real effort here: search by function names, domain terms, and structural patterns, not just file names.
3. **Consolidation plan.** If duplications are found, propose how to consolidate before implementing. Never copy/paste logic between modules.
4. **Design proposal.** Which modules or layers are touched, new interfaces needed, and domain boundaries affected.
5. **Acceptance criteria and tests.** Define concrete "done" criteria and what tests validate them.

## Phase 2 — Change Plan

Post a follow-up comment on the issue with:

1. Concrete steps in execution order.
2. Files to create, modify, or delete.
3. Dependencies on other issues discovered during the survey.

## Phase 3 — Implementation

1. Deliver changes in small, explainable blocks.
2. Update or create tests for each block.
3. Eliminate any duplication introduced or pre-existing related duplication.
4. Business logic lives in domain or application layers; endpoints only orchestrate.

## Phase 4 — Repo Hygiene

1. **Abstraction discipline.** Extract to a shared module only when the same logic already exists in two or more places. Do not create abstractions preemptively; an abstraction without proven duplication adds indirection and cognitive load for no benefit.
2. **Readable code.** Classes, functions, and modules MUST be human-readable. Add inline documentation where intent is not obvious from the code itself — but do not over-document: a clear name and a one-line comment beat a paragraph that restates what the code already says.
3. **Doc maps.** If a new abstraction is introduced, update relevant doc maps so other contributors can discover it.
4. The PR description MUST list all files modified and which tests to run.

## Phase 5 — Canon Sync

After the PR is merged, extract reusable architectural learnings and update the collab-architecture canon. This phase ensures that knowledge gained during implementation is captured as enforceable, product-agnostic rules.

1. **Extract candidates.** Review the implementation for recurring patterns, invariants, implicit contracts, and new domain rules. Separate learnings into: domain rules, patterns, decisions (ADR), and cross-layer contracts (UIC).
2. **Deduplicate.** Search the canon for existing entries that already cover the learning. Update existing entries instead of duplicating.
3. **Write canonical entries.** Place rules and patterns under the most specific domain folder. Each entry MUST have a stable ID, use enforceable language (MUST/MUST NOT/MAY), and include consequences.
4. **Alignment check.** Before committing, verify internal consistency of the canon:
   - No ID collisions within any category (axioms, decisions, conventions, rules, patterns, anti-patterns, contracts).
   - All new entries include required fields per their category template (ID, Status, Confidence, date).
   - New graph nodes have corresponding entries in `graph/seed.yaml` with valid edge types per `schema/graph.schema.yaml`.
   - Cross-domain references exist where rules impose obligations on other domains.
   - Index files (`README.md`, `knowledge/README.md`, `domains/README.md`, `prompts/README.md`) reflect the new entries.
   - `embeddings/sources.yaml` covers all new file paths.
   - `evolution/changelog.md` documents the change with correct date ordering.
   - `evolution/deprecated.md` is updated if any entry is deprecated.
5. **Contracts.** If the implementation introduced or changed UI↔backend response shapes, create or update a contract with semver versioning.
6. **Validate and commit.** Verify no product-specific names leaked into the canon. Commit with a message prefixed by `Canon:`.

This phase MAY be skipped if the implementation introduced no reusable architectural learnings. The contributor MUST explicitly state that Phase 5 was evaluated and found unnecessary.

## Thematic Agent Triggers

Phase agents (Phase 1–5) MAY invoke thematic agents when specific conditions are met during their phase. Trigger types:

- **MUST**: The phase agent is required to invoke the thematic agent when the condition is met.
- **SHOULD**: The phase agent is expected to invoke the thematic agent when the condition is met, unless a documented reason justifies skipping it.

Triggers are declared in both directions: phase prompts list which thematic agents they may invoke, and thematic agent prompts list which phases may trigger them. This intentional redundancy enables integrity checking.

## Agent Prompt Synchronization

Every phase defined in this document MUST have a corresponding agent prompt at `prompts/agents/phase-{N}-{slug}.md`. This ensures AI agents always operate according to the current process.

When this document is modified:

1. **Phase added.** A new agent prompt MUST be created in the same PR. The prompt MUST reference the GOV-R-001 phase it implements, define expected inputs and outputs, and follow the structure of existing phase prompts.
2. **Phase scope updated.** The corresponding agent prompt MUST be updated in the same PR to reflect the new scope. Changes to acceptance criteria, responsibilities, or constraints in a phase MUST be mirrored in the prompt.
3. **Phase removed.** The corresponding agent prompt MUST be removed or marked deprecated in the same PR.
4. **`prompts/README.md`** MUST be updated to reflect any structural change to the agent prompt set.
5. **`evolution/changelog.md`** MUST document the alignment.

A PR that modifies phases in this document without updating the affected agent prompts MUST NOT be merged.

## Scope

This process applies to every repository under collab-architecture governance:
- `collab-architecture`
- `collab-architecture-mcp`
- `collab-cli`
- Any future repository added to the governance scope.

Trivial fixes (typos, single-line corrections) MAY skip Phase 1 and Phase 2 but MUST still follow Phase 3, Phase 4, and Phase 5.
