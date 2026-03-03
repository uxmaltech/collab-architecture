# AP-002 Implicit Contracts

Status: Active
Created: 2026-02-02
Confidence: verified

Rule:
Implicit or undocumented contracts between UI and backend are forbidden. Every cross-layer contract MUST be explicit and versioned.

Scope:
All cross-layer interactions.

Rules Violated:
- AX-003 (Traceable Architecture) — contracts must be explicitly documented with IDs
- CN-002 (Canonical Versioning) — contracts must be versioned
