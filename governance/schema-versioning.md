# Schema Versioning Policy

## Version Identifier

The canonical schema version lives in `schema/version.json`. All consumers (MCP server, CLI, agents) read this file to determine compatibility.

## Version Format

Schema versions follow [Semantic Versioning 2.0.0](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

## Bump Policy

### Patch (e.g., 1.0.0 → 1.0.1)
- Additive changes that do not affect existing queries or validations
- Documentation corrections in schema comments
- Adding optional fields with defaults to existing node/edge types
- Relaxing validation constraints (e.g., widening an enum)

### Minor (e.g., 1.0.0 → 1.1.0)
- New node types added to the graph schema
- New edge types added to the graph schema
- New vector record fields (non-breaking)
- New contract types

### Major (e.g., 1.0.0 → 2.0.0)
- Removing or renaming existing node/edge types
- Changing required fields or their types
- Modifying ID format patterns (e.g., `VEC-[0-9a-f]{8}` → different pattern)
- Changing validation constraints in breaking ways (e.g., narrowing an enum)
- Altering the graph seed structure in incompatible ways

## Compatibility Fields

| Field | Description |
|-------|-------------|
| `schemaVersion` | Current schema version |
| `minCompatibleMCP` | Minimum MCP server version that can consume this schema |
| `minCompatibleCLI` | Minimum CLI version that can consume this schema |
| `lastUpdated` | ISO date of last schema change |
| `schemas` | Map of schema name → file path |

## Process

1. When modifying any file in `schema/`, determine the bump level per the policy above.
2. Update `schema/version.json` with the new version and `lastUpdated` date.
3. Record the change in `evolution/changelog.md` with the schema version.
4. MCP server and CLI should check `schemaVersion` on startup and warn if incompatible.

## Consumers

- **MCP server** (`collab-architecture-mcp`): reads `schema/version.json` to validate compatibility on startup.
- **CLI** (`collab-cli`): reads `schema/version.json` when syncing or querying architecture context.
- **Agents**: reference `schemaVersion` when proposing schema changes.
