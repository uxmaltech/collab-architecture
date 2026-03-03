# ADR-004 Third-Party UI Widgets Under Contract Wrappers

Status: Active
Created: 2026-02-05
Confidence: provisional

## Context
Backoffice UI occasionally requires rich interactive widgets (date pickers, autocomplete, rich text editors) that are costly to build from scratch.

## Decision
Third-party UI widgets are permitted only when wrapped by contract-emitting components, use runtime events, and enforce server-side validation and declared asset loading.

Constraints:
- Widget MUST be wrapped in a contract-emitting component with `data-uxmal-*` attributes
- Widget MUST emit runtime lifecycle events for readiness and state changes
- All user input MUST be validated server-side regardless of client-side validation
- Asset dependencies MUST be declared in server-rendered views
- Direct DOM manipulation by third-party code MUST be scoped to the wrapper component

## Rationale
Third-party widgets provide proven UX patterns and save development time, but they introduce risks: unpredictable DOM manipulation, implicit dependencies, and inconsistent event models. Requiring explicit contract wrappers ensures widgets remain auditable and consistent with canonical UI patterns.

## Consequences
- Reduces development overhead for complex UI components
- Maintains contract-based architecture even with third-party code
- Requires upfront wrapper development for each adopted widget
- Risk of widgets breaking contract assumptions if not properly wrapped
