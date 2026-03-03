# Cross-Layer Anti-Patterns

- CL-AP-001: Changing backend payload shape without incrementing a contract version.

  **Rules Violated:**
  - CL-R-001 (Every UI to backend interaction must map to a named and versioned UIContract)
  - CL-R-002 (Breaking changes require a new major version and a migration guide)

- CL-AP-002: UI logic that depends on undocumented backend fields.

  **Rules Violated:**
  - CL-R-001 (Every UI to backend interaction must map to a named and versioned UIContract)
  - CL-R-003 (Error codes and payloads must be stable within a contract version)

- CL-AP-003: Dual-purpose endpoints that mix command and query semantics.

  **Rules Violated:**
  - CL-R-001 (Every UI to backend interaction must map to a named and versioned UIContract)

- CL-AP-004: Client-side derivation of authoritative business state.

  **Rules Violated:**
  - CL-R-001 (Every UI to backend interaction must map to a named and versioned UIContract)
  - CL-R-005 (UI behavior must reference backend contract versions explicitly)
