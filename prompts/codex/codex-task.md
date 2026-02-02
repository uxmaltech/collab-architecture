# Codex Task Prompt

Before performing any code analysis or generation:
1. Load the knowledge graph and locate relevant nodes and edges for the target domain.
2. Use vector recall only to expand on graph-referenced rules, patterns, or decisions.
3. Validate the proposed change against domain rules, cross-layer contracts, and global axioms.

If the change violates the canon:
- Reject the change.
- Cite the conflicting canonical IDs.
- Suggest creating a new ADR if an exception is required.

If the change is permissible:
- Proceed while explicitly documenting which canonical items justify the approach.
