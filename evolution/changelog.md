# Canon Changelog

Evolution policy:
- All canon changes MUST be recorded here with exact IDs and dates.
- Rule changes require an ADR and, when breaking, a migration guide.
- This log is the authoritative timeline used to detect architectural drift.

## 2026-03-03
- Added "Agent Prompt Synchronization" section to [GOV-R-001](../governance/implementation-process.md): any PR that adds, updates, or removes a phase MUST update the corresponding `prompts/agents/phase-{N}-{slug}.md` in the same PR.
- Added `prompts/init/` directory for `collab init` command:
  - `system-prompt.md` — AI instructions for initial repository analysis (domain detection, axioms, ADRs, conventions, anti-patterns)
  - `user-prompt.md` — Reference for constructing user prompts with repository context
- Added `prompts/update/` directory for AI-assisted canon updates:
  - `system-prompt.md` — AI instructions for updating canon files while preserving user edits
  - `user-prompt.md` — Templates for update requirements and validation criteria
- Updated `prompts/README.md` to document new directory structure and usage

## 2026-02-02
- Initialized Collab Architecture canon and repository structure.
- Established core domains, axioms, and schemas.

## 2026-02-05
- Added Backoffice UI rules BO-R-008 through BO-R-012 and anti-patterns BO-AP-006, BO-AP-007.
- Updated BO-PAT-001 to enforce event-driven enhancement and asset declaration semantics.
- Added cross-layer rule CL-R-006 for registry-based contract invocation.
- Added ADR-003 and ADR-004 for table and third-party widget exceptions.
- Updated UIC-001 to v1.1.0 and added UIC-002 for named route registry and payload validation.

## 2026-03-02
- Added [GOV-R-001 Implementation Process](../governance/implementation-process.md): mandatory four-phase process (Survey, Change Plan, Implementation, Repo Hygiene) for all governed repositories.
- Closed 16 ecosystem-split issues (CA#5, CA#6, CA#7, CA#9, CA#10, CA#11, CA#12, CA#13, CA#16, CA#17, CA#18, CA#19, CA#20, CA#22, CA#23, CA#24) with evidence tracing.

## 2026-03-01
- Completed ecosystem split: extracted MCP runtime to `collab-architecture-mcp`, removed `tools/mcp-collab/`, Makefile, and operational scripts.
- Added [Upgrade Guide](upgrade-guide.md) for cross-repo version management.
- Added "Modes of Operation" section to README (file-only vs indexed).
- Measured canon token count: ~7,300 tokens across 76 files.

## 2026-02-24
- Added `ADR-003-v2-context-topology` to document V2 tool topology and store partitioning rationale:
  - Qdrant collections by technical scope and business domain.
  - Nebula spaces by context (`technical_architecture`, `business_architecture`).
