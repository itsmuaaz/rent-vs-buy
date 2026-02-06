# Technology Stack

## Core
- **Language:** JavaScript (ES6+) with **JSDoc** for type safety.
- **Runtime:** Browser (Client-side only) / Node.js (for testing)

## Frontend
- **Framework:** [Alpine.js](https://alpinejs.dev/) - For lightweight, reactive state management without a build step.
- **Styling:** [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework (via CDN for development, configurable for production).
- **Visualization:** [Chart.js](https://www.chartjs.org/) - For rendering the wealth projection charts.
- **HTML Structure:** Semantic HTML5 (`index.html`).

## Logic Layer
- **Financial Engine:** `engine.js` - Pure JavaScript module containing all financial formulas, tax logic, and simulation loops.
    - **Architecture:** **Object-Oriented Design** (Strategy Pattern). Uses `RentStrategy`, `BuyStrategy`, `BTLStrategy`, and `HybridStrategy` classes to encapsulate logic.
    - **Type Safety:** Enforced via **JSDoc** annotations to catch regressions and missing properties during development (checked via VS Code or similar tools).
- **Audit Logic:** `audit.js` - Dictionary of logic explanations and proof generation functions for the "Transparency Report".

## Development & Testing
- **Test Runner:** [Jest](https://jestjs.io/) - For unit testing the core logic (`engine.test.js`).
- **Quality Control:** [Husky](https://typicode.github.io/husky/) - Pre-commit hooks to ensure tests pass before committing.
- **Linting/Formatting:** (Implicit) Standard JS style.
- **Package Manager:** npm
