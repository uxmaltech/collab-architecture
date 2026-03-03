# ADR-003 Non-Canonical Tables for Small Static Lists

Status: Active
Created: 2026-02-05
Confidence: provisional

## Context
Some backoffice screens require displaying small, static lists that do not justify server-side pagination, sorting, or filtering infrastructure.

## Decision
Non-canonical client-side tables are permitted only for small static datasets without server-side pagination, sorting, or filtering.

Constraints:
- Dataset MUST be small (fewer than 100 rows)
- Dataset MUST be static (no dynamic updates from user actions)
- No server-side pagination, sorting, or filtering MUST be required
- For larger or dynamic datasets, canonical GridJS tables MUST be used

## Rationale
Small static tables represent a pragmatic exception to the canonical table pattern. The overhead of implementing full GridJS integration for truly static, small datasets outweighs the benefits. This decision explicitly bounds the exception to prevent scope creep.

## Consequences
- Reduced implementation overhead for simple static lists
- Clear boundary: once a list needs pagination/sorting/filtering, it must migrate to canonical GridJS
- Risk of exceptions growing over time if not strictly enforced
