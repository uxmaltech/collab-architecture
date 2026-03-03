# What Enters the Canon

Only architectural knowledge that is enforceable and reusable enters the canon.

Admission rules:
- The entry MUST be atomic and scoped to a single rule, pattern, or decision.
- The entry MUST include a stable ID, status, creation date, and Confidence level (experimental, provisional, verified, or deprecated).
- The entry MUST reference the domain(s) it applies to.
- The entry MUST be validated against the schemas in schema/.
- The entry MUST not duplicate existing canon; duplicates are rejected.
- The entry MUST be written in English. No translations, localized variants, or bilingual files are permitted.
- New canonical entries SHOULD be extracted during Phase 5 — Canon Sync after implementation work completes (see [GOV-R-001 Implementation Process](implementation-process.md)).

Excluded:
- Implementation details tied to a single codebase.
- Team-specific preferences without architectural impact.
- Advice or guidance without enforceable language.
