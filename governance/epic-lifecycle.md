# GOV-R-001 Epic Lifecycle

ID: GOV-R-001
Status: active
Confidence: experimental
Created: 2026-03-04

Every feature or change that requires planning, discovery, and decomposition into implementable stories MUST follow this process. This is the upstream entry point of the Collab development lifecycle.

## Lifecycle Context

```
GOV-R-001 (Epic Lifecycle) → GOV-R-002 (Implementation) → GOV-R-003 (Canon Sync)
```

This process creates the work items that feed into GOV-R-002.

## Phase 1 — Discovery

**Actor:** Discovery Agent (LLM via collab-core-pkg) + Human

1. **Structured interview.** The Discovery Agent conducts a structured conversation with the human to understand the idea, detect gaps, question assumptions, and suggest options. The agent is role-agnostic — it does not know or assume the human's role (Product Partner, Technical Partner, stakeholder).
2. **MCP research.** The LLM autonomously researches via MCP tools:
   - Impacted domains (graph query on domain nodes and edges).
   - Affected repositories (domain-to-repo mapping).
   - Dependencies (DEPENDS_ON edges in the knowledge graph).
   - Known risks (anti-patterns, conflicting rules, existing decisions).
3. **Epic Brief.** The output is a markdown artifact persisted as a living document during the conversation, containing:
   - Business context — problem being solved, target user, expected value.
   - Acceptance criteria — verifiable "done" conditions.
   - Functional scope — what is included, what is explicitly excluded.
   - Impacted domains, affected repos, dependencies, and known risks (resolved by LLM).

## Phase 2 — Epic Creation

**Actor:** Discovery Agent (LLM), with human approval

1. The Discovery Agent MUST NOT create issues without human approval of the Epic Brief.
2. Create Epic Issue in the primary business repository (or configured business canon repo) with a structured body containing: context, acceptance criteria, scope, domains, repos, and risks.
3. Primary repository resolution:
   - LLM suggests based on MCP analysis (most-impacted repo).
   - Business unit MAY configure a default in the workspace.
   - Human confirms or overrides.

**Constraint:** Epic issues MUST live in the primary business repository or the configured business canon repo — NEVER in `collab-architecture`.

## Phase 3 — Story Decomposition

**Actor:** Discovery Agent (LLM), with human approval

1. Decompose the Epic into Story Issues — one per affected repository.
2. Each Story Issue MUST:
   - Reference its parent Epic Issue.
   - Be created in the repository where the work will happen.
   - Include enough context for GOV-R-002 Phase 1 (Survey & Plan) to proceed without re-reading the full Epic.
3. Stories are assigned by the LLM based on domain-to-repo mapping.
4. Human reviews and approves the decomposition before issues are created.

## Handoff to Implementation

Each Story Issue created by this process enters [GOV-R-002 Implementation Process](implementation-process.md). The contributor (human or agent) who picks up a Story follows GOV-R-002 Phase 1 through Phase 3.

## Agent Prompt Synchronization

Every phase defined in this document MUST have a corresponding agent prompt at `prompts/agents/epic-phase-{N}-{slug}.md`. A PR that modifies phases without updating the affected agent prompts MUST NOT be merged.

## Scope

This process applies to all feature work that requires planning and decomposition. It does NOT apply to:
- Bug fixes already scoped to a single repository (these enter GOV-R-002 directly).
- Trivial fixes (these enter GOV-R-002 with Phase 1 skip).
