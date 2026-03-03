# Canon Changelog

Evolution policy:
- All canon changes MUST be recorded here with exact IDs and dates.
- Rule changes require an ADR and, when breaking, a migration guide.
- This log is the authoritative timeline used to detect architectural drift.

## 2026-03-03

### Canon Alignment Audit Fixes
- **Fixed ADR-003 ID collision:** Renamed `ADR-003-v2-context-topology.md` to ADR-005. Created missing `ADR-003-non-canonical-tables.md` and `ADR-004-third-party-ui-widgets.md`.
- **Removed Spanish translation:** Deleted `ADR-005-v2-context-topology-es.md` per governance requirement that all canon must be in English.
- **Added Confidence field to all knowledge files:** All axioms (AX-001, AX-002, AX-003), decisions (ADR-001, ADR-002, ADR-003, ADR-004, ADR-005), conventions (CN-001, CN-002), and anti-patterns (AP-001, AP-002, AP-003) now include Confidence field per GOV requirement.
- **Fixed APPLIES_TO edge schema violation:** Updated `schema/graph.schema.yaml` to allow Decision, UIContract, and AntiPattern as valid from_types for APPLIES_TO edges.
- **Added ADR-005 to graph/seed.yaml:** V2 Context Topology decision now properly seeded in knowledge graph.
- **Expanded graph/seed.yaml:** Added 8 missing knowledge artifacts (ADR-001, ADR-002, ADR-004, CN-001, CN-002, AP-001, AP-002, AP-003) and 8 domain patterns (PAT-004 through PAT-011).
- **Added graph edges for new nodes:** Created 23 new edges (EDGE-0022 through EDGE-0044) to connect previously orphaned nodes - all patterns now IMPLEMENT their domains, all conventions/anti-patterns now APPLIES_TO domains, ADR-001/002 JUSTIFIES axioms.
- **Fixed evolution files:** Reordered changelog.md chronologically, updated deprecated.md to reflect post-session-canon-update.md deprecation, removed orphaned CHANGELOG.md.
- **Expanded README files:** Added contracts/ to main README, created full index in knowledge/README.md (including ADR-004), listed all 3 domains in domains/README.md.
- **Added cross-domain references:** All domain principles and rules now include "Related Domains" sections linking to relevant cross-domain patterns and rules.
- **Updated governance files:** Added Confidence requirement and Phase 5 reference to what-enters-the-canon.md, added Phase 5 cross-reference to review-process.md.
- **Fixed prompts:** Corrected confidence levels in prompts/update/user-prompt.md, updated phase-1-survey.md to reference canon instead of docs/architecture/, updated Codex prompts for file-only mode, updated pattern-extractor to reference graph/seed/ directory.
- **Standardized date fields:** All decision files now use "Created:" instead of "Date:" for consistency.
- **Added "Rules Violated" sections:** All knowledge anti-patterns (AP-001, AP-002, AP-003) now document which axioms/conventions they violate.
- **Added contracts to embeddings:** Updated embeddings/sources.yaml to include contracts/**/*.yaml.

### Phase 5 and Agent Prompts
- **GOV-R-001 expanded to five phases.** Added Phase 5 — Canon Sync: mandatory post-merge phase for extracting reusable architectural learnings into the collab-architecture canon.
- Added "Thematic Agent Triggers" section to GOV-R-001: defines MUST/SHOULD trigger types for phase-to-thematic agent invocation.
- Created `prompts/agents/phase-5-canon-sync.md` — agent prompt for Phase 5, supersedes `post-session-canon-update.md`.
- Deprecated `prompts/agents/post-session-canon-update.md` — functionality absorbed by Phase 5 canon sync agent.
- Added `Thematic agent triggers:` section to all five phase agent prompts (Option C cross-references).
- Added `Triggered by:` section to all three thematic agent prompts (`architecture-reviewer`, `drift-detector`, `pattern-extractor`).
- Updated `prompts/README.md` with two-layer agent model documentation, trigger types, cross-reference model, and trigger map table.
- Added "Agent Prompt Synchronization" section to [GOV-R-001](../governance/implementation-process.md): any PR that adds, updates, or removes a phase MUST update the corresponding `prompts/agents/phase-{N}-{slug}.md` in the same PR.
- Added four phase-aligned agent prompts to `prompts/agents/` per GOV-R-001:
  - `phase-1-survey.md` — codebase exploration, duplication check, design proposal
  - `phase-2-change-plan.md` — ordered execution steps, file list, dependencies
  - `phase-3-implementation.md` — small blocks with tests, duplication elimination
  - `phase-4-repo-hygiene.md` — abstraction discipline, readability, doc maps, PR audit
- Updated `prompts/README.md` to document phase agents and thematic agents as separate groups, added synchronization rule reference (GOV-R-001, #39).
- Added `prompts/init/` directory for `collab init` command:
  - `system-prompt.md` — AI instructions for initial repository analysis (domain detection, axioms, ADRs, conventions, anti-patterns)
  - `user-prompt.md` — Reference for constructing user prompts with repository context
- Added `prompts/update/` directory for AI-assisted canon updates:
  - `system-prompt.md` — AI instructions for updating canon files while preserving user edits
  - `user-prompt.md` — Templates for update requirements and validation criteria
- Updated `prompts/README.md` to document new directory structure and usage

## 2026-03-02
- Added [GOV-R-001 Implementation Process](../governance/implementation-process.md): mandatory four-phase process (Survey, Change Plan, Implementation, Repo Hygiene) for all governed repositories.
- Closed 16 ecosystem-split issues (CA#5, CA#6, CA#7, CA#9, CA#10, CA#11, CA#12, CA#13, CA#16, CA#17, CA#18, CA#19, CA#20, CA#22, CA#23, CA#24) with evidence tracing.

## 2026-03-01
- Completed ecosystem split: extracted MCP runtime to `collab-architecture-mcp`, removed `tools/mcp-collab/`, Makefile, and operational scripts.
- Added [Upgrade Guide](upgrade-guide.md) for cross-repo version management.
- Added "Modes of Operation" section to README (file-only vs indexed).
- Measured canon token count: ~7,300 tokens across 76 files.

## 2026-02-24
- Added `ADR-005-v2-context-topology` (previously ADR-003) to document V2 tool topology and store partitioning rationale:
  - Qdrant collections by technical scope and business domain.
  - Nebula spaces by context (`technical_architecture`, `business_architecture`).

## 2026-02-05
- Added Backoffice UI rules BO-R-008 through BO-R-012 and anti-patterns BO-AP-006, BO-AP-007.
- Updated BO-PAT-001 to enforce event-driven enhancement and asset declaration semantics.
- Added cross-layer rule CL-R-006 for registry-based contract invocation.
- Added ADR-003 and ADR-004 for table and third-party widget exceptions.
- Updated UIC-001 to v1.1.0 and added UIC-002 for named route registry and payload validation.

## 2026-02-02
- Initialized Collab Architecture canon and repository structure.
- Established core domains, axioms, and schemas.
