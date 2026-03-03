# Review Process

All changes to the canon follow this process:

1. Proposal
   - A Collab agent or engineer creates a canonical entry draft with a stable ID.
   - The draft includes scope, rationale, and enforcement language.

2. Validation
   - The draft is validated against schema/ and graph/ requirements.
   - Conflicts with existing canon are identified and recorded.

3. Review
   - At least one architecture reviewer agent evaluates the draft.
   - If conflicts exist, the draft is rejected or revised.

4. Approval
   - Approved entries are merged into the repository.
   - The changelog is updated and confidence assigned.

5. Publication
   - Graph and vector indexes are re-generated.
   - Collab agents reload the canon.

## Relationship to GOV-R-001

Canon entries are typically created during **Phase 5 — Canon Sync** of the [GOV-R-001 Implementation Process](implementation-process.md). After implementation work completes, the Phase 5 canon sync agent extracts reusable architectural learnings and follows this review process to promote them into the canon.
