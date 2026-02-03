# Gemini Agent Context: Rent vs. Buy Calculator

**Project:** UK Property Strategy Simulator (Rent vs. Buy vs. Invest)
**Goal:** Provide accurate, stable, and visually clear 40-year wealth projections based on complex UK tax rules.

## 🏗 Architecture & Mental Model

This project follows a strict **"Engine vs. Dashboard"** separation of concerns.

1.  **The Financial Engine (`engine.js`)**
    *   **Role:** The Source of Truth.
    *   **Content:** Pure JavaScript functions. NO DOM access. NO UI logic.
    *   **Responsibility:** Calculates Mortgages, Stamp Duty, Section 24 Tax, Compound Interest loops.
    *   **Testing:** Fully covered by `engine.test.js`.

2.  **The Logic Dictionary (`audit.js`)**
    *   **Role:** The Transparency Layer.
    *   **Content:** A dictionary of logic definitions + functions to generate personalized proofs.
    *   **Responsibility:** Explains the math to the user using their live numbers.

3.  **The Dashboard (`index.html` + `app.js`)**
    *   **Role:** The View Layer.
    *   **Content:** HTML, TailwindCSS, Chart.js, Alpine.js.
    *   **Responsibility:** Collects inputs, calls `Engine`, renders Charts/Tables/Modals.
    *   **Constraint:** NEVER calculate financial logic here. Only formatting and display.

4.  **The Safety Net (Jest + Husky)**
    *   **Role:** Regression Protection.
    *   **Mechanism:** `npm test` runs automatically on `git commit`.
    *   **Rule:** If `npm test` fails, the codebase is broken. Do not proceed until fixed.

---

## ⚠️ Core Mandates for Agents

### 1. Stability is Paramount
This is a financial tool. A math error is worse than a crash.
*   **Before** touching `engine.js`: Understand the tax rule you are changing.
*   **After** touching `engine.js`: Run `npm test` immediately.
*   **Golden Snapshots:** The tests contain "Magic Numbers" (e.g., Year 10 Net Worth = 449,087). These are the Gold Standard. If your change alters these numbers, you MUST verify if the change is intentional (a fix) or accidental (a bug).

### 2. Separation of Concerns
*   **IF** you are fixing a calculation (e.g., "Stamp duty is wrong"):
    *   EDIT `engine.js`.
    *   UPDATE `engine.test.js`.
*   **IF** you are adding an explanation:
    *   EDIT `audit.js`.
*   **IF** you are fixing a UI bug (e.g., "Button is wrong color"):
    *   EDIT `index.html` or `app.js`.
    *   DO NOT touch `engine.js`.

### 3. Testing is Mandatory & Systematic
*   **Regression:** A `pre-commit` hook (Husky) prevents committing broken code. Never bypass it.
*   **New Features:** Any new logic added to `engine.js` **MUST** have a corresponding test case in `engine.test.js`.
*   **UI Logic:** Any complex UI logic (presets, audit integration) should be tested in `app.test.js`.
*   **Coverage:** Ensure tests cover edge cases (e.g., 0% interest, mortgage payoff, tax thresholds).

---

## 🛠 Development Workflow

1.  **Start:** Run `npm test` to confirm baseline health.
2.  **Edit:** Make your changes.
    *   *Logic:* Edit `engine.js` -> Add/Update Test in `engine.test.js` -> Run `npm test`.
    *   *UI:* Edit `index.html` / `app.js` -> Verify in browser (manual) or `app.test.js`.
3.  **Commit:** `git commit` will auto-run tests.

## 📂 Key Files

*   `engine.js`: Core logic. (Pure JS, CommonJS/Browser hybrid export).
*   `audit.js`: Logic Dictionary for the Transparency Modal.
*   `app.js`: UI logic and state management (Alpine.js).
*   `engine.test.js`: Jest test suite for financial logic.
*   `app.test.js`: Jest test suite for UI controller logic.
*   `index.html`: Main UI. Imports `engine.js`, `audit.js`.
*   `.husky/pre-commit`: Ensures tests pass before commit.

## 🚀 Future Roadmap

*   **Phase 1 (Complete):** Core Engine & Basic UI.
*   **Phase 2 (Complete):** Alpine.js Refactor (Reactivity).
*   **Phase 3 (Complete):** Transparency & Audit Mode.
*   **Phase 4 (Active):** Strategy Scout (Onboarding Wizard) & Scenarios.

---
*Created by Gemini for Gemini. adhere strictly to these protocols.*
