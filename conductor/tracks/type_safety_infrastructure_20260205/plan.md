# Implementation Plan: Type Safety Infrastructure

## Phase 1: Configuration & Plumbing
- [x] Task: Install TypeScript as a dev dependency. eb9fd83
    - [x] `npm install --save-dev typescript`
- [ ] Task: Create `jsconfig.json`.
    - [ ] Configure `compilerOptions` with `allowJs: true`, `checkJs: true`, `noEmit: true`, `strict: true`, `target: "ES2020"`.
    - [ ] Include `src` (or root) and exclude `node_modules`.
- [ ] Task: Add `typecheck` script to `package.json`.
    - [ ] Script: `tsc --noEmit`.
- [ ] Task: Update Husky pre-commit hook.
    - [ ] Add `npm run typecheck` before `npm test`.

## Phase 2: Engine Type Hardening (The Fix)
- [ ] Task: Run `npm run typecheck` to identify initial errors.
    - [ ] Expect errors in `engine.js` (e.g., "Property 'isa' does not exist on type 'Strategy'").
- [ ] Task: Fix JSDoc errors in `engine.js`.
    - [ ] Explicitly declare class properties in constructors or with JSDoc fields.
    - [ ] Fix any type mismatches found by the compiler.
    - [ ] Ensure `Engine` global variable is properly typed or declared to avoid conflicts.
- [ ] Task: Verify Clean Run.
    - [ ] Ensure `npm run typecheck` exits with code 0.

## Phase 3: Integration Verification
- [ ] Task: Validate Workflow.
    - [ ] Intentional sabotage: Introduce a type error (e.g., `this.isa = "string"`).
    - [ ] Try to commit.
    - [ ] Confirm Husky blocks the commit.
- [ ] Task: Conductor - User Manual Verification 'Integration Verification' (Protocol in workflow.md)
