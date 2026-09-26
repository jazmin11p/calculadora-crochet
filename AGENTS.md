# Agent Guidelines & Workflow Rules

## 1. Strict Planning Rule: Always Plan First
- **No Direct Coding without Approval:** Never write, modify, delete files, or execute modifying commands without first creating an implementation plan and receiving explicit approval from the user.
- **Mandatory Lifecycle:**
  1. **Research & Inspect:** Use read-only tools to investigate codebase state, configuration files, and root causes without modifying anything.
  2. **Create Implementation Plan:** Present the plan through the agent's plan mode, outlining the problem, architecture, file-by-file changes, open questions, and verification steps. Don't write plan files into the repository.
  3. **Wait for Approval:** Stop and present the plan to the user for review and refinement.
  4. **Execute Only When Approved:** Only after the user explicitly approves the plan, proceed to development, file modifications, and testing.
- **Universal Scope:** This rule applies unconditionally to all tasks, tweaks, bug fixes, or refactors, regardless of perceived simplicity.

## 2. Mandatory Test-Driven Development (TDD) Rule: Always Test First
- **Strict Red-Green-Refactor Lifecycle:** When designing plans and writing code, always structure work into discrete TDD cycles.
- **Red Phase (Tests First):** Write automated unit or integration tests that assert the desired behavior and verify that they fail before writing any implementation code.
- **Green Phase (Minimal Implementation):** Write the minimal implementation code necessary to make the failing tests pass.
- **Refactor Phase:** Clean up and optimize the implementation while ensuring 100% of the test suite remains passing.
- **Planning Integration:** Every implementation plan must explicitly structure features into sequential TDD cycles, detailing the Red (tests & expected failures), Green (minimal code changes), and Refactor stages for each cycle.

## 3. Mandatory Clean Architecture Rule: Always Follow Clean Architecture
- **Strict Inward Dependency Rule (`presentation -> domain <- infrastructure`, wired by `app.js`):**
  1. **`js/domain` is the Independent Core:** Contains pure JavaScript entities, calculation formulas (chains, swatch gauge, ease, shaping, yardage), static reference data (yarn standards, hook sizes, garment presets) and repository/service contracts. It must have ZERO dependencies on the DOM, Firebase SDKs, browser storage or outer layers (`infrastructure`, `presentation`).
  2. **`js/infrastructure` Depends ONLY on `domain`:** Implements authentication and persistence (Firebase Auth, Firestore, `localStorage`). It must have ZERO imports from `presentation` and must not touch the DOM.
  3. **`js/presentation` Depends ONLY on `domain`:** DOM rendering, event handling and view state. It must have ZERO direct imports from `infrastructure` or Firebase SDKs; it receives what it needs through injected functions or objects.
  4. **`js/app.js` is the Composition Root:** The sole module permitted to wire infrastructure implementations into presentation and to bootstrap the app.
- **Inter-Layer Mappers:** Always use dedicated mappers between layers (e.g. Firestore / `localStorage` documents $\leftrightarrow$ domain entities inside `infrastructure`) to prevent storage changes from leaking into the UI.
- **Automated Boundary Enforcement:** All architecture boundary rules must be covered by automated import-based tests and executed on every test run and Git pre-commit hook. Cross-layer violations must immediately fail the build.

## 4. Sub-Agent Rule: Keep Token Cost Down
- **Delegate what doesn't need the main model's judgement:** **Sonnet** for simple, well-specified tasks, **Haiku** for the most basic ones (lookups, boilerplate, doc checkboxes).
- **The main agent keeps design decisions** and reviews every delegated diff before it is committed.
- **Hand-offs are complete:** a sub-agent starts cold, so give it the tests, specs and file paths it needs.
