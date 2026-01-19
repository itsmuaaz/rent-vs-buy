# Product Improvement Report: Rent vs Buy Calculator

**Date:** January 18, 2026
**Version Analysis:** v4.0 (Asset Model)
**Focus:** UX/UI Enhancement, Feature Expansion, Product Appeal

## 1. Executive Summary
The current application (v4.0) is a robust **financial engine** wrapped in a functional but utilitarian interface. It handles complex UK tax logic (SDLT, Section 24, Ltd Co) better than most competitors. However, it suffers from "Spreadsheet Syndrome": it presents too much data too quickly, overwhelming novice users, and lacks the visual "delight" of modern fintech apps (like Monzo or Revolut).

To evolve from a *calculator* to a *product*, we must focus on **progressive disclosure** (already started), **visual storytelling**, and **guided onboarding**.

---

## 2. User Experience (UX) & Onboarding

### A. The "Wizard" Mode (High Priority)
**Problem:** New users land on a dashboard with ~20 visible inputs. This causes cognitive overload ("Analysis Paralysis").
**Solution:** Implement a "First Run" Wizard that asks 4-5 key questions before showing the full dashboard.
*   **Step 1:** "Where do you live?" (Sets regional rent/price defaults).
*   **Step 2:** "How much cash do you have?" (Savings).
*   **Step 3:** "What can you afford monthly?" (Budget).
*   **Action:** Generate the initial report, *then* reveal the full sidebar for tweaking.

### B. Mobile-First Input Design (Medium Priority)
**Problem:** On mobile, the Sidebar is a long scrollable column *above* the results. Users must scroll past it to see charts, then scroll back up to tweak.
**Solution:**
*   **Floating Action Button (FAB):** "Edit Inputs" button on mobile that opens a **Bottom Sheet** or **Off-canvas Sidebar**.
*   **Result Persistence:** Keep the "Verdict" headline sticky at the top while scrolling charts.

### C. "Real Terms" Toggle (High Priority)
**Problem:** Users see "Year 40 Net Worth: £2.5m" and think they will be rich. They forget that £2.5m in 40 years is worth much less due to inflation.
**Solution:** Add a global toggle: **"Show in Today's Money"**.
*   **Logic:** Discount future values by the Inflation Rate (`1.03^n`).
*   **Benefit:** Provides a grounded, realistic financial outlook.

---

## 3. Visual Polish & UI (The "Delight" Factor)

### A. Iconography & Typography
**Current:** Standard System Fonts and Emojis (🇬🇧, 🏠).
**Improvement:**
*   **Font:** Switch to **Inter** or **Lato** for a cleaner, fintech look.
*   **Icons:** Replace emojis with **Heroicons** (SVG). Emojis look amateurish in professional tools.
    *   *Example:* Replace 🏠 with a clean house outline SVG.

### B. Chart Interactivity
**Current:** Static Chart.js with basic tooltips.
**Improvement:**
*   **Annotations:** Add markers for key events (e.g., "Mortgage Paid Off" at Year 25).
*   **Gradient Fills:** Use semi-transparent gradients under the lines to make charts feel "alive".
*   **Dynamic Legends:** Click a legend item to isolate that line (already supported by Chart.js, ensure it's obvious).

### C. Animation
**Current:** Instant state changes.
**Improvement:** Use `x-transition` in Alpine.js for:
*   Collapsing/Expanding sidebar sections.
*   The appearance of the "Reality Check" warning (fade in/slide down).
*   Smooth scrolling to the "Verdict" when a preset is clicked.

---

## 4. Feature Expansion (Functional Depth)

### A. Mortgage Overpayments (High Priority)
**Gap:** The engine calculates standard amortization. Users obsessed with "FIRE" (Financial Independence) love overpayments.
**Feature:** Add an "Overpayment (£/mo)" input.
*   **Visual:** Show a new line or marker: "Mortgage-Free 7 Years Early!".
*   **Engine:** Subtract extra cash from Principal *before* interest calculation each month.

### B. Scenario Comparison (Medium Priority)
**Gap:** Users can compare "Rent vs Buy". They cannot compare "Buy Flat" vs "Buy House".
**Feature:** "Snapshot" functionality.
*   User sets up "Scenario A", clicks "Save Snapshot".
*   User changes inputs to "Scenario B".
*   Charts show dotted lines for the saved snapshot alongside the current active scenario.

### C. Backend/Cloud (Low Priority - Future)
**Gap:** Settings are local-only (`localStorage`).
**Feature:** "Shareable Scenarios" via URL is implemented (Base64), but long URLs break on some platforms.
*   **Idea:** Shortlink generator (requires backend).
*   **Idea:** "Export to CSV" for Excel nerds (Easy, Client-side).

---

## 5. Technical Recommendations

*   **Refactor `engine.js`:** The `simulateStrategies` function is monolithic (~200 lines). Break it down into `simulateRent()`, `simulateBuy()`, etc. for maintainability.
*   **Unit Test Expansion:** Add tests for the new "Reality Check" logic and ensure the "Range Sliders" don't introduce floating-point precision errors.
*   **Performance:** The sensitivity matrix runs 25 simulations. Ensure this is debounced (it is) and perhaps run in a **Web Worker** if we increase resolution (e.g., 10x10 grid).

## 6. Implementation Roadmap (Proposed)

| Phase | Theme | Key Deliverables |
| :--- | :--- | :--- |
| **1** | **Realism & Math** | Inflation Toggle ("Today's Money"), Mortgage Overpayments. |
| **2** | **Visual Overhaul** | SVG Icons, Custom Fonts, `x-transition` animations, Chart gradients. |
| **3** | **Mobile UX** | Bottom Sheet for inputs, Sticky Header for results. |
| **4** | **Onboarding** | "Wizard" Mode for first-time visitors. |

**Immediate Recommendation:** Start with **Phase 1 (Inflation Toggle)** as it fundamentally changes how users interpret the data, providing immediate value with low UI effort.