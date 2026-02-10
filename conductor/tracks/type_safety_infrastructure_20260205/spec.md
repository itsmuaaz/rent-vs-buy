# Track Specification: Type Safety Infrastructure (Strict JSDoc)

## Goal
To implement a robust type-checking system using **Strict JSDoc** and the TypeScript compiler (in "check-only" mode). This will catch null-reference errors, type mismatches, and regression bugs *before* they are committed, without introducing a compilation build step.

## Context
The project intentionally avoids a build pipeline ("Zero-Build"). However, as the `engine.js` logic grows complex (Object-Oriented Strategy pattern), manual testing is insufficient to catch edge cases (like the recent `matrix` null error). We need automated safety rails.

## Functional Requirements

### 1. Configuration (`jsconfig.json`)
- Create a `jsconfig.json` file to configure the TypeScript Language Server.
- **Enable `checkJs`:** Forces the compiler to validate JS files against their JSDoc annotations.
- **Strict Mode:** Enable `strict: true` (or at least `strictNullChecks`) to catch "Cannot read property of null" errors.
- **Target:** ES6+ (matching the project's runtime).

### 2. CI/CD Integration (`package.json` & Husky)
- **New Script:** Add `npm run typecheck` which runs `tsc --noEmit`. This command will output errors to the console if the code violates the JSDoc contracts.
- **Git Hook:** Update the existing `.husky/pre-commit` hook to run `npm run typecheck` *before* `npm test`. This prevents bad code from even being tested, speeding up the feedback loop.

### 3. Engine Type Refinement
- The existing JSDoc in `engine.js` (added in the previous track) will be the source of truth.
- We will run the new `typecheck` command and **fix any existing errors** it reveals (likely many, as `checkJs` is strict). This is the core "bug capturing" work.

## Non-Functional Requirements
- **Zero Runtime Impact:** This change MUST NOT affect `index.html` or how the app runs in the browser. It is purely a developer-tooling change.
- **Performance:** Type checking should be fast (< 5s).

## Out of Scope
- Migrating files to `.ts`.
- Creating separate `.d.ts` files (we are keeping types inline in `engine.js` for simplicity).
