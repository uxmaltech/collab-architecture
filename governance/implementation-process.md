# GOV-R-002 Implementation Process

ID: GOV-R-002
Status: active
Confidence: verified
Created: 2026-03-04

Every issue in a repository governed by collab-architecture MUST follow this three-phase process before merging. The contributor (human or agent) acts as Staff Engineer responsible for architectural coherence of the target repository.

## Lifecycle Context

```
GOV-R-001 (Epic Lifecycle) → GOV-R-002 (Implementation) → GOV-R-003 (Canon Sync)
```

Story Issues created by GOV-R-001 enter this process. After merge, GOV-R-003 determines if architectural learnings should be captured.

## Compatible Agents

The implementation is executed on GitHub (issues, branches, PRs, code review). Compatible agents:

- **Codex (OpenAI)** — agent CLI with multi-file editing capabilities.
- **Claude Code (Anthropic)** — agent CLI with deep analysis capabilities.
- **GitHub Copilot** — additional option: native GitHub agent. Low-cost, suitable for plan-guided implementations.

The agent operates on the GitHub issue, creates a branch, implements, and opens a PR.

## Phase 1 — Survey & Change Plan

Before writing any code, analyze the issue and produce a single deliverable combining exploration and execution plan:

### Survey
1. **Relevant files and modules.** Search across directory structures, grep for related identifiers, and trace import chains. The goal is to leave no relevant file undiscovered.
2. **Duplication check.** Identify any existing logic that overlaps with the issue scope. Search by function names, domain terms, and structural patterns — not just file names. If context is missing, propose how to locate what exists before assuming.
3. **Consolidation plan.** If duplications are found, propose how to consolidate before implementing. Never copy/paste logic between modules.
4. **Design proposal.** Which modules or layers are touched, new interfaces needed, and domain boundaries affected.
5. **Acceptance criteria and tests.** Define concrete "done" criteria and what tests validate them.

### Change Plan
6. **Concrete steps in execution order.** Break the implementation into small, ordered tasks. Each step MUST name the specific file(s) it touches and describe the change at function/class level.
7. **Files to create, modify, or delete.** Produce an explicit list with target paths and purposes.
8. **Dependencies on other issues.** If the survey reveals blockers or prerequisite work, list them with issue references.
9. **Risk assessment.** For each step, note if it could break existing tests, affect shared modules, or change public API surfaces.

## Phase 2 — Implementation

1. **Deliver changes in small, explainable blocks.** Each block MUST correspond to one or more steps from the change plan. A block is a set of related changes that can be understood and reviewed independently.
2. **Update or create tests for each block.** No block is complete without tests that validate it. Tests MUST cover the acceptance criteria defined in Phase 1.
3. **Eliminate duplication.** Remove any duplication introduced by the change AND any pre-existing related duplication discovered during Phase 1. If a consolidation plan was proposed, execute it.
4. **Enforce layer separation.** Business logic MUST live in domain or application layers. Endpoints, controllers, and UI handlers MUST only orchestrate — they MUST NOT contain business rules, validation logic, or data transformation.

## Phase 3 — Repo Hygiene

1. **Abstraction discipline.** Extract to a shared module only when the same logic already exists in two or more places. Do not create abstractions preemptively; an abstraction without proven duplication adds indirection and cognitive load for no benefit.
2. **Readable code.** Classes, functions, and modules MUST be human-readable. Add inline documentation where intent is not obvious from the code itself — but do not over-document: a clear name and a one-line comment beat a paragraph that restates what the code already says.
3. **Doc maps.** If a new abstraction is introduced, update relevant doc maps so other contributors can discover it.
4. The PR description MUST list all files modified and which tests to run.

## Post-Merge Handoff

After a PR governed by this process is merged:

1. The contributor MUST evaluate whether [GOV-R-003 Canon Sync](canon-sync.md) applies.
2. If the implementation introduced reusable architectural learnings, the contributor MUST follow GOV-R-003.
3. If no learnings exist, the contributor MUST explicitly state that GOV-R-003 was evaluated and found unnecessary.

## Thematic Agent Triggers

Phase agents MAY invoke thematic agents when specific conditions are met:

- **MUST**: The phase agent is required to invoke the thematic agent when the condition is met.
- **SHOULD**: The phase agent is expected to invoke it unless a documented reason justifies skipping.

Triggers are declared in both directions: phase prompts list which thematic agents they may invoke, and thematic agent prompts list which phases may trigger them. This intentional redundancy enables integrity checking.

## Agent Prompt Synchronization

Every phase defined in this document MUST have a corresponding agent prompt at `prompts/agents/impl-phase-{N}-{slug}.md`. A PR that modifies phases without updating the affected agent prompts MUST NOT be merged.

## Scope

This process applies to every repository under collab-architecture governance:
- `collab-architecture`
- `collab-architecture-mcp`
- `collab-cli`
- Any future repository added to the governance scope.

Trivial fixes (typos, single-line corrections) MAY skip Phase 1 but MUST still follow Phase 2 and Phase 3.
