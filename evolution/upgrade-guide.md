# Cross-Repo Upgrade Guide

This guide documents how to upgrade each component of the Collab ecosystem and how version changes propagate between repositories.

## Version Matrix

| Component | Current | File | Compatibility |
|-----------|---------|------|---------------|
| Canon Schema | 1.0.0 | `collab-architecture/schema/version.json` | Defines truth |
| MCP Server | 0.1.0 | `collab-architecture-mcp/package.json` | Schema ^1.0.0 |
| MCP Contract | 1.0.0 | `collab-architecture-mcp/CONTRACT.md` | — |
| CLI | 0.1.0 | `collab-cli/package.json` | Schema ^1.0.0, MCP ^0.1.0, Contract ^1.0.0 |

## Dependency Chain

```
collab-architecture (schema v1.0.0)
    ↑ read by
collab-architecture-mcp (v0.1.0, contract v1.0.0)
    ↑ orchestrated by
collab-cli (v0.1.0, manifest v1.0.0)
```

The CLI orchestrates the MCP server, which reads the canon. Version compatibility flows upward: canon changes may require MCP updates, which may require CLI updates.

## Upgrade Scenarios

### Scenario 1: Canon Schema Change

**When:** A new rule, schema field, or graph structure is added to `collab-architecture`.

**Upgrade order:**
1. **collab-architecture** — Update `schema/version.json` (bump minor for additions, major for breaking changes). Record in `evolution/changelog.md`.
2. **collab-architecture-mcp** — If the MCP server reads the changed schema fields, update `lib/schema-validator.mjs` to accept the new version range. Bump `package.json` version.
3. **collab-cli** — If the manifest range no longer covers the new schema version, update `ecosystem.manifest.json`.

**Verification:**
```bash
collab doctor
```
The `doctor` command checks schema version against the MCP supported range and the CLI manifest range.

**Breaking change (major bump):**
- Schema major version changes (e.g., 1.x → 2.x) require MCP to update its `SUPPORTED_SCHEMA_RANGE.maxMajor`.
- Until MCP is updated, the server will reject the new schema with "Major version mismatch".
- Always update MCP before deploying a major schema change.

### Scenario 2: MCP API Change

**When:** The MCP server adds/removes tools, changes endpoints, or modifies the contract.

**Upgrade order:**
1. **collab-architecture-mcp** — Update tool registrations, bump `package.json` version. Update `CONTRACT.md` if the API surface changes.
2. **collab-cli** — If the contract version changes, update `ecosystem.manifest.json` `collabArchitectureMcpContractRange`. The CLI checks the MCP `/health` endpoint for version and contract compatibility.
3. **collab-architecture** — No changes needed (canon is upstream of MCP).

**Verification:**
```bash
collab doctor
collab mcp status
```

### Scenario 3: CLI Change

**When:** The CLI adds new commands, changes wizard behavior, or updates compose templates.

**Upgrade order:**
1. **collab-cli** — Bump `package.json` version. Update `ecosystem.manifest.json` if compatibility ranges change.
2. **collab-architecture-mcp** — No changes needed (MCP is unaware of CLI).
3. **collab-architecture** — No changes needed.

**Verification:**
```bash
collab --version
collab doctor
```

## Upgrade Order Summary

| Change type | Update first | Then | Then |
|-------------|-------------|------|------|
| Canon schema (minor) | collab-architecture | collab-architecture-mcp (if needed) | collab-cli (if needed) |
| Canon schema (major) | collab-architecture | collab-architecture-mcp (required) | collab-cli (required) |
| MCP tool/endpoint | collab-architecture-mcp | collab-cli (if contract changed) | — |
| CLI command/wizard | collab-cli | — | — |

## Rollback Procedures

### Rolling back a canon change
1. Revert the commit in `collab-architecture` and bump the patch version in `schema/version.json`.
2. Re-seed graph and vectors: `node scripts/seed-graph.mjs` and `npm run ingest:v2` in `collab-architecture-mcp`.
3. Run `collab doctor` to verify.

### Rolling back an MCP change
1. Revert the commit in `collab-architecture-mcp` or deploy the previous Docker image tag.
2. If the contract version changed, revert `ecosystem.manifest.json` in `collab-cli`.
3. Restart: `collab mcp stop && collab mcp start`.
4. Run `collab doctor` to verify.

### Rolling back a CLI change
1. Install the previous CLI version: `npm install -g @uxmaltech/collab-cli@<previous-version>`.
2. Run `collab doctor` to verify compatibility with current MCP and schema.

## How `collab doctor` Validates Compatibility

The `doctor` command performs these checks:
1. **CLI version** — Checks own version against `ecosystem.manifest.json` `cliVersionRange`.
2. **Schema version** — Reads `collab-architecture/schema/version.json` and checks against `collabArchitectureSchemaRange`.
3. **MCP health** — Calls the MCP `/health` endpoint to get server version and contract version, checks against `collabArchitectureMcpVersionRange` and `collabArchitectureMcpContractRange`.
4. **Infrastructure** — Verifies Qdrant and NebulaGraph containers are running and healthy.

If any check fails, `doctor` reports the mismatch with the expected and actual versions.
