# GOV-R-001 Implementation Process

ID: GOV-R-001
Status: active
Confidence: verified
Created: 2026-03-02

Every issue in a repository governed by collab-architecture MUST [GOV-R-001] follow this four-phase process before merging. The contributor (human or agent) acts as Staff Engineer responsible for architectural coherence of the target repository.

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

1. If a new abstraction is introduced, update relevant doc maps.
2. The PR description MUST list all files modified and which tests to run.
3. Prefer extracting to a shared module over duplicating across modules.

## Scope

This process applies to every repository under collab-architecture governance:
- `collab-architecture`
- `collab-architecture-mcp`
- `collab-cli`
- Any future repository added to the governance scope.

Trivial fixes (typos, single-line corrections) MAY skip Phase 1 and Phase 2 but MUST still follow Phase 3 and Phase 4.
