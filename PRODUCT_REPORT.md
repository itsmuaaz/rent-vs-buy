# Product Improvement Report: Rent vs Buy Calculator

**Date:** January 19, 2026
**Status Analysis:** UX & Reports
**Focus:** Onboarding, Comparative Analysis, and Growth

## 1. Executive Summary
The application has matured significantly with the recent updates. The addition of the **Sticky Result Bar** (Mobile), **PDF Reports** (Professionalism), and **Smart Input Formatting** (Usability) has transformed it from a basic calculator into a usable decision-support tool.

However, the "Day 1" experience remains daunting. New users are greeted by a sidebar with 40+ inputs, leading to "Analysis Paralysis." The primary goal for the next phase is to smooth this entry ramp via a **Wizard** and allow deeper analysis via **Snapshots**.

---

## 2. Completed Improvements

| Feature | Status | Impact |
| :--- | :--- | :--- |
| **Input Formatting** | ✅ Done | Inputs now show commas (`£300,000`), reducing reading errors significantly. |
| **Sticky Result Bar** | ✅ Done | Mobile users see the "Winner" instantly while scrolling/editing inputs. |
| **PDF Report** | ✅ Done | Users can export a 3-page professional dossier for offline use. |
| **Inflation Toggle** | ✅ Done | "Real Terms" view is now available in the UI. |

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

### C. Input Validation & Guardrails
**Priority: Medium**
*   **Problem:** Users can enter invalid states (e.g., Deposit > Price).
*   **Solution:** Reactive validation.
    *   **UI:** Red borders for invalid fields.
    *   **Logic:** Disable "Export Report" if critical errors exist.

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

## 6. Design Document: The Wizard

**Trigger:** `!localStorage.getItem('hasSeenWizard') && !urlParams.has('data')`
**Architecture:**
*   **Step 1:** Archetype (FTB / Mover / Landlord) -> Sets flags.
*   **Step 2:** Financials (Rent, Cash, Savings) -> Sets `personal` object.
*   **Step 3:** Property (Price, Lodger?) -> Sets `home` object & calculates `depositPct`.
**Exit:** "Show me the numbers" -> Fades out modal, runs simulation.

---
*Report updated Jan 19, 2026*