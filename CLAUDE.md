# CLAUDE.md

This is the canonical architecture repository for the UxmalTech framework. It defines enforceable rules, patterns, decisions, and contracts that govern all UxmalTech systems.

## Key facts

- This repo is the **framework canon** — the single source of truth for architecture
- It does NOT contain application code; only architectural knowledge
- Governing rule: "If it is not in Collab Architecture, it is not a rule yet"
- This repo is **agnostic** to any specific application or business canon — it does not reference or depend on application-level architecture repos
- `.md` files are always canonical; NebulaGraph and Qdrant indexes are derived artifacts that can be rebuilt at any time
- All canon entries MUST be in English
- All entries MUST include: stable ID, status, created date, confidence level, domain references
- Confidence levels: `experimental`, `provisional`, `verified`, `deprecated`

## Ecosystem context

- `collab-architecture` (this repo) is the framework-level source of truth
- `collab-cli` orchestrates canon sync, infrastructure, and domain generation
- `collab-architecture-mcp` exposes this canon as graph + vectors to AI agents
- Application canons are separate, configurable repos that inherit from this framework

## Repository structure

```
knowledge/          → Axioms (AX-###), decisions (ADR-###), conventions (CN-###), anti-patterns (AP-###)
domains/            → Domain-specific rules, patterns, anti-patterns, glossaries
  backend-cbq/      → CBQ rules (CBQ-R-###), patterns (CBQ-PAT-###)
  backoffice-ui/    → BOUI rules (BO-R-###), patterns (BO-PAT-###)
  cross-layer/      → Cross-layer rules (CL-R-###), patterns (CL-PAT-###)
contracts/          → Versioned UI↔backend contracts (UIC-###)
graph/              → NebulaGraph schemas (nodes/, edges/) and seed data (seed/)
schema/             → Validation schemas (graph, vector, contracts, version)
embeddings/         → Ingestion configuration and vector sources
prompts/            → Agent prompts: phase-based (1-5), thematic, Codex, init/update
governance/         → GOV-R-001 process, review, confidence levels, admissions criteria
evolution/          → Changelog, deprecations, migration guides, upgrade guide
```

## ID system

| Pattern | Type | Example |
|---------|------|---------|
| `AX-###` | Axiom | AX-001 Authoritative Canon |
| `ADR-###` | Architectural decision | ADR-006 Collab AI-Assisted Platform |
| `CN-###` | Convention | CN-001 Canonical Naming |
| `AP-###` | Global anti-pattern | AP-001 Architecture in Code |
| `DOM-###` | Domain | DOM-001 Backoffice UI |
| `{DOMAIN}-R-###` | Domain rule | BO-R-001, CBQ-R-003 |
| `{DOMAIN}-PAT-###` | Domain pattern | BO-PAT-001, CBQ-PAT-003 |
| `UIC-###` | UI contract | UIC-001 GridJS List Endpoint |
| `TECH-###` | Technology | TECH-001 PHP |
| `GOV-R-###` | Governance rule | GOV-R-001 Implementation Process |

## Governance (GOV-R-001)

Every change follows a five-phase process:
1. **Survey** — explore, detect duplication, propose design
2. **Change Plan** — concrete steps, files, dependencies
3. **Implementation** — small blocks, tests, eliminate duplication
4. **Repo Hygiene** — abstraction, legibility, documentation
5. **Canon Sync** — extract learnings, update canon, validate consistency

## Validation

- Entries must satisfy schemas in `schema/`
- Changes must be recorded in `evolution/changelog.md` with IDs and dates
- Graph seeds in `graph/seed/` must stay consistent with canon content
- Use enforceable language: MUST/SHALL for rules, SHOULD for recommendations

## Naming conventions

- Filenames: `kebab-case` with stable IDs (e.g., `AX-001-authoritative-canon.md`)
- YAML: 2-space indentation
- Markdown: clear headings, ID-forward
- Each entry is atomic — one rule, one decision, one pattern per file

## Do not

- Add application-specific rules here — those belong in the application's own canon repo
- Reference any specific application canon repo by name
- Embed code from application repositories
- Duplicate canon entries across domains
- Skip `evolution/changelog.md` updates
