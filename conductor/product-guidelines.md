# Product Guidelines

## Tone & Voice
- **Empowering & Friendly:** The language should be accessible to everyday users, avoiding overly dense financial jargon where possible, while remaining accurate.
- **Capable & Trusted:** While friendly, the application must exude competence. When complex topics (like tax rules) arise, explain them clearly and precisely.
- **Educational:** The goal is not just to give an answer, but to help the user understand *why*. Use tooltips and "Audit Mode" to peel back the layers of the calculation.

## User Experience (UX) Principles
- **Novice-First Defaults:**
    - **Realistic Assumptions:** Default values (e.g., inflation, stock growth, property maintenance) must represent the "most realistic" scenario for the majority of UK users. Avoid optimistic or pessimistic extremes by default.
    - **Smart Presets:** Utilize "Quick Start" presets (e.g., "London Professional", "First Time Buyer", "Portfolio Landlord") to instantly populate the form with relevant, sensible data, reducing the "blank slate" paralysis.
    - **Auto-Fill & Inference:** Where possible, infer values to save effort. For example, if a user enters a property price, estimate the likely deposit amount (e.g., 10-15%) or Stamp Duty instantly, rather than forcing them to calculate it manually.
- **Progressive Disclosure:**
    - **Default View:** Keep the interface clean and focused on the core inputs (Rent, House Price, Salary/Savings).
    - **Power User Access:** Hide complex settings (e.g., specific tax band overrides, growth rate assumptions, stress tests) behind collapsible "Advanced Settings" toggles. This prevents overwhelming new users while keeping the tool powerful for experts.
- **Visual Clarity:**
    - **Color Coding:** Use consistent colors for strategies across the UI to reduce cognitive load.
        - **Rent:** Blue
        - **Buy:** Green
        - **Investing/BTL:** Purple
    - **Heatmaps & Charts:** Use visual aids like the "Rent vs Buy" sensitivity matrix to show trends rather than just raw data tables.
- **Transparency First:**
    - **Audit Mode:** Every major calculation (Stamp Duty, Mortgage Interest, Tax Bill) must be verifiable. The "Transparency Report" section should walk the user through the math using their own live numbers.
    - **No "Black Boxes":** If a result looks surprising (e.g., "Renting wins"), the tool must be able to explain the contributing factors (e.g., "High stock growth assumption vs. low property yield").

## Design System
- **Framework:** TailwindCSS
- **Typography:** Inter (Clean, modern sans-serif) for readability.
- **Components:**
    - **Cards:** Use white cards with subtle shadows (`shadow-sm`) and borders (`border-gray-200`) to group related content.
    - **Inputs:** Clear labels with helper tooltips (`?` icons) for financial terms.
    - **Mobile First:** Ensure the sidebar collapses or adapts gracefully for mobile users, as the tool is web-based and likely accessed on phones.
