# Canon Changelog

Evolution policy:
- All canon changes MUST be recorded here with exact IDs and dates.
- Rule changes require an ADR and, when breaking, a migration guide.
- This log is the authoritative timeline used to detect architectural drift.

## 2026-03-04

### ADR-006: Collab AI-Assisted Development Platform
- **Added [ADR-006](../knowledge/decisions/ADR-006-collab-ai-assisted-development-platform.md):** Defines Collab as an AI-assisted software development platform operating as a virtual development company with specialized agents.
- **Key decisions documented:**
  - Discovery Agent as role-agnostic LLM that interviews humans to fill epic gaps, consulting MCP for domains, repos, dependencies, and risks.
  - Epic Issue hierarchy: Epic in primary business repo → Story Issues in contextual repos.
  - Business canon repos (`{business}/collab-architecture`) separate from framework canon (`uxmaltech/collab-architecture`).
  - Markdown files as canonical source of truth; NebulaGraph and Qdrant are derived artifacts.
  - Knowledge flywheel: merge → canon sync → MCP update → smarter discovery next cycle.
  - New `collab-project-manager` package for multi-project tracking.
- **Package responsibilities mapped:** collab-laravel-app, collab-chat-ai-pkg, collab-core-pkg, collab-project-manager, collab-architecture, collab-architecture-mcp, collab-cli.
- **Confidence:** experimental (vision document, implementation pending).
- **Added ADR-006 Decision vertex to graph/seed/data.ngql** with APPLIES_TO edges to all three domains.

## 2026-03-03

### Consolidation Audit Fixes
- **Fixed CL-PAT-002 ID collision (#62):** Renamed `compatibility-envelope.md` Pattern ID from CL-PAT-002 to CL-PAT-004 to resolve collision with `observability-fields.md`.
- **Added Confidence field to 17 pattern files (#65):** All patterns now include `Confidence: provisional` or `Confidence: verified` per GOV requirement.
- **Strengthened weak rules (#65):** BO-R-003 and CL-R-002 rewritten with RFC 2119 MUST keywords instead of declarative phrasing.
- **Fixed stale references (#65):** AGENTS.md and README.md updated from "four-phase" to "five-phase". CBQ-PAT-004 section header standardized to "Enforceable Semantics:". Prompt init confidence vocabulary corrected from HIGH/MEDIUM/LOW to experimental/provisional/verified.
- **Added 6 pattern nodes to graph/seed.yaml (#63):** PAT-012 through PAT-017 with 6 IMPLEMENTS edges (EDGE-0045 through EDGE-0050) for patterns added in Domain Completeness PR.
- **Strengthened 8 thin patterns with Enforceable Semantics (#64):** CBQ-PAT-001, CBQ-PAT-002, CBQ-PAT-003, BO-PAT-001, BO-PAT-002, BO-PAT-003, CL-PAT-001, CL-PAT-004 now include concrete MUST/MUST NOT constraints beyond what their rules already state.
- **Rationale:** Implements findings from Consolidation Audit (issue #61) to eliminate vague patterns, fix ID collisions, and ensure all canon files meet schema requirements.

### Domain Completeness: Orphan Rules, Glossary Gaps, Anti-Pattern Symmetry
- **Added 6 new patterns for orphan rules:**
  - CBQ-PAT-006 (Deterministic Cron-Based Rebuilds) — enforces CBQ-R-004
  - CBQ-PAT-007 (Explicit Command Outcomes) — enforces CBQ-R-007
  - BO-PAT-005 (Runtime API Isolation) — enforces BO-R-008
  - BO-PAT-006 (HTML Sanitization) — enforces BO-R-012
  - CL-PAT-002 (Mandatory Observability Fields) — enforces CL-R-004
  - CL-PAT-003 (Named-Route Registry) — enforces CL-R-006
- **Added 3 new Backend CBQ principles:** CBQ-P-006 (snapshots), CBQ-P-007 (soft delete), CBQ-P-008 (DB connection)
- **Added 7 new Backoffice UI principles:** BO-P-006 through BO-P-012 covering client-side routing, inline JS, runtime API, lifecycle, re-init, assets, and sanitization
- **Updated all 3 domain glossaries:**
  - Backend CBQ: Added soft delete, deterministic rebuild, explicit outcome, DB selector
  - Backoffice UI: Added runtime API, lifecycle events, named-route registry, asset dependencies, HTML sanitization
  - Cross-Layer: Added observability fields, named-route registry, contract client
- **Added "Rules Violated" sections to all domain anti-patterns:**
  - Backend CBQ: CBQ-AP-001 through CBQ-AP-005 now reference violated rules
  - Backoffice UI: BO-AP-001 through BO-AP-007 now reference violated rules
  - Cross-Layer: CL-AP-001 through CL-AP-004 now reference violated rules
- **Rationale:** Closes remaining items from Canon Alignment Audit (issue #44). BO-R-005 and BO-R-006 covered by existing principles (BO-P-006, BO-P-007) rather than new patterns as they are architectural constraints.

### English-Only Canon Rule Added
- **Added mandatory English-only language constraint to CN-001:** Updated `knowledge/conventions/CN-001-naming.md` to add "Language" section requiring all canon entries be written in English with no translations or localized variants permitted.
- **Added English-only admission requirement to governance:** Updated `governance/what-enters-the-canon.md` to include language constraint as mandatory admission rule.
- **Rationale:** Mixed-language content degrades AI agent reasoning quality, creates duplicate semantic entries in graph and vector queries, violates CN-001 uniqueness when same concept exists in multiple languages, and doubles maintenance burden.
- **Note:** Spanish translation file `ADR-005-v2-context-topology-es.md` was already removed in earlier alignment fixes (see "Canon Alignment Audit Fixes" section below).

### Canon Alignment Check Added to Phase 5
- **Added mandatory alignment check to GOV-R-001 Phase 5:** New step 4 requires verification of internal canon consistency before committing (ID collisions, required fields, graph seed entries, cross-domain references, index files, embeddings sources, changelog ordering, deprecation tracking).
- **Updated `governance/implementation-process.md`:** Inserted alignment check as Phase 5 step 4, renumbered prior steps 4→5 to 5→6.
- **Updated `prompts/agents/phase-5-canon-sync.md`:** Added alignment check to Process section as step 4, renumbered subsequent steps.
- **Addresses root cause of canon alignment audit findings:** Prevents recurrence of ID collisions, schema violations, missing fields, stale indexes, and incomplete graph seeding identified in issue #44.

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
