# Pattern: HTML Sanitization for User Content

Pattern ID: BO-PAT-006
Status: Active
Confidence: provisional

Context:
User-supplied content or external data sources may contain malicious HTML or scripts that must be neutralized before rendering.

Problem:
Raw HTML injection enables XSS attacks and compromises client security. Trusting external content without validation exposes all users.

Solution:
User-supplied or external HTML MUST be sanitized or escaped before rendering. Server-side sanitization is preferred. If client-side sanitization is required, use a vetted library with a documented allowlist policy.

Rules Enforced:
- BO-R-012

Enforceable Semantics:
- User inputs rendered in HTML MUST be escaped (e.g., `htmlspecialchars()` in PHP, framework-native escaping in templates).
- If rich HTML is required (e.g., WYSIWYG editors), sanitization MUST use an allowlist-based sanitizer (e.g., HTMLPurifier, DOMPurify).
- Allowlists MUST be documented and minimal: only safe tags, attributes, and protocols.
- Raw `innerHTML` or `document.write()` with user content MUST NOT occur.
- External content (APIs, webhooks) MUST be treated as untrusted and sanitized before render.

Consequences:
- XSS attack surface is minimized.
- Security policies are auditable and enforceable.
- User experience remains safe and predictable.
