# Product Improvement Report: Rent vs Buy Calculator

**Date:** February 3, 2026
**Status Analysis:** Transparency, Stability & Testing
**Focus:** Trust, Verification, and Edge Case Stability

## 1. Executive Summary
The application has taken a major leap in professional credibility. The addition of the **Transparency Modal (Audit Mode)** allows users to verify calculations against their own numbers, addressing the "Black Box" trust issue. We also eliminated a critical **Simulation Bug** where wealth projections failed after the mortgage term ended (Year 30+).

## 2. Completed Improvements

| Feature | Status | Impact |
| :--- | :--- | :--- |
| **Transparency Modal** | ✅ Done | Users can now audit Stamp Duty, Mortgage, and Tax math step-by-step. |
| **BTL Stability Fix** | ✅ Done | Fixed a NaN bug that occurred when mortgage terms ended before the simulation horizon. |
| **Controller Tests** | ✅ Done | Added `app.test.js` to verify UI logic, Presets, and Audit generation. |
| **Lifecycle Tests** | ✅ Done | Expanded `engine.test.js` to cover full 40-year mortgage lifecycles and cash purchases. |
| **Renovation Logic** | ✅ Done | "Post-Work Value" now smartly syncs with Property Price unless manually customized. |

---

## 3. High Priority Initiatives

### A. The "Strategy Scout" Wizard (Onboarding)
**Priority: Critical**
*   **Problem:** New users face a "Wall of Inputs."
*   **Solution:** A 3-step overlay modal that launches on first visit.
    *   **Step 1 (Identity):** "Are you a First Time Buyer, Mover, or Investor?" (Sets Logic).
    *   **Step 2 (Fuel):** "How much cash do you have?" (Sets Finances).
    *   **Step 3 (Target):** "What price property are you looking at?" (Sets Property).
*   **Magic:** The Wizard *calculates* the deposit % automatically based on cash available, preventing initial errors.

### B. Scenario Snapshots (Comparative Analysis)
**Priority: High**
*   **Problem:** Users cannot compare "House A" vs "House B" side-by-side.
*   **Solution:** A "Snapshot" feature.
    *   **Action:** Button: "📸 Save Snapshot 1".
    *   **Visual:** Dotted lines appear on the chart representing the saved run.
    *   **Value:** Instant A/B testing of financial decisions.

---

## 4. Backlog & Design Ideas (Future)

### A. Visual Polish (The "Delight" Factor)
*   **Fonts:** Switch to **Inter** or **Lato** for a cleaner, modern fintech look.
*   **Icons:** Replace emojis with **Heroicons (SVGs)** to look more professional.
*   **Charts:** Add **Gradient Fills** under lines to make charts feel "alive" and **Annotations** for key events (e.g., "Mortgage Paid Off").

### B. Mobile Enhancements
*   **Input Sheet:** A **Floating Action Button (FAB)** that opens a "Bottom Sheet" or "Off-canvas Sidebar" for inputs, solving the scrolling issue on mobile (Sticky Bar solves the result visibility, but editing is still scroll-heavy).

### C. Advanced Features
*   **CSV Export:** Allow users to download the raw data table for Excel analysis.
*   **Cloud Saving:** Generate shortlinks (backend required) instead of long Base64 URLs.

---

## 5. Technical Roadmap

1.  **Refactor `engine.js`:** The simulation loop is getting complex. Break strategies into distinct functions (`simulateRent`, `simulateBuy`, `simulateBTL`) before adding more complexity like "Snapshots".
2.  **Debouncing:** With the addition of "Snapshots" (double rendering), input debouncing will become mandatory for performance.
3.  **Social Sharing:** Enhance the "Share" button to generate WhatsApp-ready text payloads (e.g., *"I'm £45k better off renting!"*).

---
*Report updated Feb 3, 2026*
