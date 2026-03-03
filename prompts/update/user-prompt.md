# Canon Update User Prompt Template

This document provides templates for constructing user prompts when updating canon files using AI assistance.

## Purpose

The user prompt specifies:
- Which canon files to update
- What governance rule or schema change triggered the update
- What structural changes are required
- What user content must be preserved

## Prompt Template

```
Update canon files to comply with: <governance rule or schema version>

Files to update:
- <path/to/file1.md>
- <path/to/file2.md>
- <all files matching pattern>

Required changes:
- <add missing section X>
- <update metadata field Y>
- <normalize ID format>
- <add cross-references to related entries>

Preserve:
- All user-authored descriptions and rationale
- Manually added examples and evidence
- Domain-specific context

Validation:
- Validate against schema: <schema path>
- Check cross-reference integrity
- Ensure all required fields are present
```

## Example Prompts

### Example 1: Schema Migration
```
Update canon files to comply with: schema version 2.0

Files to update:
- knowledge/axioms/*.md
- knowledge/decisions/*.md

Required changes:
- Add `domain` field to frontmatter
- Add `tags` array to frontmatter
- Add "Evidence" section if missing
- Ensure `status` is one of: draft, active, deprecated, retired

Preserve:
- All existing content in Description, Context, Decision sections
- User-provided examples
- Manually added cross-references

Validation:
- Validate against schema: schema/canon-entry.schema.yaml
```

### Example 2: ID Normalization
```
Update canon files to normalize ID format: AX-001 → AX-0001 (4-digit padding)

Files to update:
- All axiom files (knowledge/axioms/AX-*.md)
- All files that reference axioms

Required changes:
- Update ID in file header
- Rename file if ID is in filename
- Update all cross-references throughout the canon
- Update changelog references

Preserve:
- All file content except IDs
- File creation dates
- Authorship information

Validation:
- Verify all cross-references resolve
- Check no broken links after rename
- Ensure changelog is updated
```

### Example 3: Adding Cross-References
```
Update canon files to add bi-directional cross-references

Files to update:
- knowledge/axioms/*.md (link to related ADRs)
- knowledge/decisions/*.md (link to related axioms)

Required changes:
- Add "Related Axioms" section to ADR files
- Add "Applied In" section to axiom files
- Populate with semantic matches (shared concepts, domain overlap)

Preserve:
- All existing sections
- Manual cross-references already present

Validation:
- Verify all referenced IDs exist
- Check bi-directional links are correct
```

### Example 4: Governance Rule Application
```
Update canon files to comply with: GOV-R-002 (mandatory confidence field)

Files to update:
- All canon entries missing `confidence` field

Required changes:
- Add `confidence: draft` to frontmatter for entries without it
- Infer confidence level based on:
  - Status=active + evidence provided → confidence=verified
  - Status=active + no evidence → confidence=working
  - Status=draft → confidence=draft

Preserve:
- Existing confidence values
- All content sections
- Manual metadata

Validation:
- Ensure confidence is one of: draft, working, verified
- Check confidence aligns with status
```

## Construction Guidelines

1. **Rule Reference**: Always cite the governance rule (GOV-XXX) or schema version
2. **File Scope**: Be explicit about which files to update (paths, patterns, or "all")
3. **Change Specification**: List concrete structural changes required
4. **Preservation Rules**: Explicitly state what user content must not be modified
5. **Validation Criteria**: Define what "success" looks like

## Advanced Scenarios

### Selective Updates
For large canons, update subsets to manage complexity:

```
Update Backoffice domain files only to comply with: schema 2.1

Files to update:
- domains/backoffice/*.md

Required changes:
- Add `layer` field (presentation, application, domain, infrastructure)
- Add "Dependencies" section listing cross-layer references

Preserve existing layer assignments where present.
```

### Conditional Updates
Apply updates based on file content:

```
Update canon files that reference deprecated patterns

Files to update:
- Scan all .md files for references to DEPRECATED-PAT-001

Required changes:
- Add warning banner about deprecated pattern
- Link to replacement pattern (PAT-042)
- Do NOT modify files that already have the warning

Preserve all other content.
```

### Batch Renames
Handle file renames with dependency tracking:

```
Rename axiom files to match new naming convention: AX-NNN-kebab-case.md

Files to update:
- knowledge/axioms/*.md

Required changes:
- Rename file: AX-001-Authoritative-Canon.md → AX-001-authoritative-canon.md
- Update internal references
- Update changelog
- Update external references from other domains

Track all affected files for git operations.
```

## Integration with `collab-cli`

The `collab update-canons` command will:
1. Detect when canon structure or governance rules change
2. Construct a user prompt using this template
3. Combine with `system-prompt.md`
4. Execute the AI-assisted update
5. Validate all changes before writing files
6. Generate update log for `evolution/changelog.md`

## Tips for Effective Update Prompts

- **Be conservative**: Only update what's required, don't "improve" content
- **Be explicit**: List exactly what changes are allowed
- **Preserve first**: Default to keeping user content unless rule requires change
- **Validate rigorously**: Check schema, cross-references, and required fields
- **Log thoroughly**: Document every change with governance justification

## Post-Update Checklist

After running an update:
1. Review the update log for unexpected changes
2. Spot-check a sample of updated files
3. Run schema validation on all updated files
4. Verify cross-references resolve
5. Update `evolution/changelog.md`
6. Commit with descriptive message referencing the governance rule
