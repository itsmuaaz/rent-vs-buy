# UK Property Strategy Simulator 🇬🇧

A professional-grade **Rent vs. Buy calculator** designed for the UK market. Unlike simple mortgage calculators, this tool simulates **40-year wealth projections** considering complex tax rules, inflation, and opportunity costs.

## 🌍 For Users

**👉 Try the Live App:** [https://itsmuaaz.github.io/rent-vs-buy/](https://itsmuaaz.github.io/rent-vs-buy/)

### Why this tool?
Most calculators just compare "Mortgage vs Rent". This tool goes deeper, modeling your entire financial life over 40 years to answer: * "Am I better off buying a home, or renting and investing the difference in the S&P 500?"*

### Key Features
*   **Multi-Strategy Comparison:** Compare 6 different financial paths simultaneously:
    *   Rent & Invest
    *   Buy Home
    *   Buy Home + Lodger (Tax-free income)
    *   Buy-to-Let (Personal Name)
    *   Buy-to-Let (Limited Company)
    *   Home + Buy-to-Let Combo
*   **True Valuation Modes:** Toggle between **Gross Equity** (Paper Wealth) and **Liquid Cash** (What you'd actually have if you sold everything today, after paying all taxes and fees).
*   **Advanced UK Tax Engine:** Accurately models:
    *   Stamp Duty Land Tax (SDLT) including Additional Dwelling Supplement.
    *   Section 24 (Mortgage Interest Relief restrictions).
    *   Capital Gains Tax & Dividend Tax.
    *   Corporation Tax for Ltd Companies.
*   **Stress Testing:** One-click simulation of market crashes (Stock Market -30% or Property Market -15%) to see if your strategy survives a recession.

---

## 💻 For Developers

### Tech Stack
*   **Core Logic:** Pure JavaScript (`engine.js`). No DOM dependencies. 100% unit-tested.
*   **UI Framework:** [Alpine.js](https://alpinejs.dev/) for reactive state management.
*   **Styling:** [TailwindCSS](https://tailwindcss.com/) (CDN for zero-build setup).
*   **Visualization:** [Chart.js](https://www.chartjs.org/).
*   **Testing:** [Jest](https://jestjs.io/) for logic verification + [Husky](https://typicode.github.io/husky/) for pre-commit hooks.

### Architecture
The project follows a strict **"Engine vs. Dashboard"** separation of concerns:
1.  **`engine.js`**: The source of truth. Contains all financial formulas and simulation loops. It is stateless and platform-agnostic (runs in Browser and Node.js).
2.  **`app.js`**: The controller. Connects the UI inputs to the Engine and handles Chart.js updates.
3.  **`index.html`**: The view.

### Local Development
1.  Clone the repository.
2.  Run `npm install` to setup testing tools.
3.  Open `index.html` in your browser (no build step required).
4.  Run `npm test` before committing to ensure calculation integrity.

---

## 📱 Did you know?

**This entire project was developed on Android using Termux.** 
It serves as a demonstration of what's possible with a powerful terminal environment on mobile.

If you are interested in turning your Android device into a development machine, check out my other project:
👉 **[termux-bootstrap](https://github.com/itsmuaaz/termux-bootstrap)**
