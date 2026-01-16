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

2.  **The Dashboard (`index.html`)**
    *   **Role:** The View Layer.
    *   **Content:** HTML, TailwindCSS, Chart.js.
    *   **Responsibility:** Collects inputs, calls `Engine`, renders Charts/Tables.
    *   **Constraint:** NEVER calculate financial logic here. Only formatting and display.

3.  **The Safety Net (Jest + Husky)**
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
*   **IF** you are fixing a UI bug (e.g., "Button is wrong color"):
    *   EDIT `index.html`.
    *   DO NOT touch `engine.js`.

### 3. Testing is Mandatory
*   A `pre-commit` hook (Husky) prevents committing broken code.
*   If you find yourself trying to bypass the hook, **STOP**. You are doing something wrong. Fix the test.

---

## 🛠 Development Workflow

1.  **Start:** Run `npm test` to confirm baseline health.
2.  **Edit:** Make your changes.
    *   *Logic:* Edit `engine.js` -> Run `npm test` -> Update expectations if needed.
    *   *UI:* Edit `index.html` -> Verify in browser (manual).
3.  **Commit:** `git commit` will auto-run tests.

## 📂 Key Files

*   `engine.js`: Core logic. (Pure JS, CommonJS/Browser hybrid export).
*   `app.js`: UI logic and state management (Alpine.js).
*   `engine.test.js`: Jest test suite. Defines "Golden Scenarios".
*   `index.html`: Main UI. Imports `engine.js`.
*   `.husky/pre-commit`: Ensures tests pass before commit.

## 🚀 Future Roadmap

*   **Phase 2:** Refactor `index.html` to use **Alpine.js** for data binding (removing `document.getElementById` spaghetti).
*   **Phase 3:** Advanced Visualization (better charts).

---
*Created by Gemini for Gemini. adhere strictly to these protocols.*
