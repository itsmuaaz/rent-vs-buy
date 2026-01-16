# UK Property Strategy Simulator 🇬🇧

A professional-grade **Rent vs. Buy calculator** designed for the UK market. Unlike simple mortgage calculators, this tool simulates **40-year wealth projections** considering complex tax rules, inflation, and opportunity costs.

## 🚀 Features

*   **Multi-Strategy Comparison:** Compare Renting vs. Buying vs. House Hacking (Lodger) vs. Ltd Company BTL.
*   **True Valuation Modes:** Toggle between **Gross Equity** (Paper Wealth) and **Liquid Cash** (Exit Value after fees/taxes).
*   **UK Tax Engine:** Fully models Stamp Duty (SDLT), Section 24 mortgage interest relief caps, Capital Gains Tax, and Corporation Tax.
*   **Dynamic Budgeting:** Automatically calculates investment surplus based on a fixed total monthly budget.
*   **Stress Testing:** Simulate market crashes (Stock -30% or Property -15%) to test resilience.

## 🛠 Tech Stack

*   **Logic:** Pure JavaScript (`engine.js`) - 100% testable.
*   **UI:** Alpine.js + TailwindCSS + Chart.js (`index.html`).
*   **Testing:** Jest + Husky (Pre-commit hooks).

## 🏃‍♂️ Usage

1.  Clone the repo.
2.  Open `index.html` in any browser.
3.  (Dev) Run `npm test` to verify logic.