# Track Specification: Strategy Scout (Wizard Mode)

## Goal
To implement an interactive "Wizard Mode" that guides users—both novices and advanced investors—through the setup of their financial profile. The goal is to simplify the onboarding process, populate the complex input forms intelligently, and educate users about potential investment strategies (like Ltd Co BTL) they might not have considered.

## Context
Currently, the application presents a dense "Dashboard" full of inputs immediately. This can be overwhelming. We need a "Strategy Scout" to hand-hold new users, ask simple questions, and configure the simulation on their behalf.

## Functional Requirements

### 1. Trigger & Access
- **Automatic:** The wizard MUST trigger automatically for new users (detected via empty local storage or a "first visit" flag).
- **Dismissible:** Users MUST be able to dismiss the wizard to access the full dashboard immediately.
- **Recallable:** A prominent "Strategy Scout" or "Help Me Set Up" button MUST be available on the main dashboard to restart the process.

### 2. UI/UX Interaction
- **Format:** Step-by-step Modal Overlay.
- **Style:** Clean, focused, and distraction-free. One question per step (or logical group of simple questions).
- **Progress:** A clear progress indicator (e.g., "Step 2 of 5").

### 3. Question Flow & Logic
The wizard will use branching logic to adapt to the user's needs.

*   **Step 1: The Basics (Rent vs Buy)**
    *   Input: Current Rent, Savings/Assets, Monthly Savings.
    *   Goal: Establish the "Baseline" (Strategy A).

*   **Step 2: Home Ownership (Primary Residence)**
    *   Question: "Are you looking to buy a home to live in?"
    *   If Yes: Ask target Property Price (or Budget).
    *   *Smart Branch:* "Would you consider renting out a spare room (Lodger)?" -> Toggles "Strategy C" (Buy + Lodger).

*   **Step 3: Investment Discovery (The "What If")**
    *   Question: "Are you interested in Property Investment (Buy-to-Let)?"
    *   If Yes OR Maybe:
        *   Ask: "Do you know if you would buy personally or through a Limited Company?"
        *   Options: "Personal", "Ltd Company", "I don't know / Compare Both".
        *   *Discovery Feature:* If they select "Compare Both" or "I don't know", the system MUST enable both Strategy D (Ltd) and E (Personal) to show the difference.

*   **Step 4: Market Assumptions (Advanced/Novice Handling)**
    *   Question: "How do you expect the market to perform?"
    *   Options:
        *   "I don't know (Use UK Averages)" -> Auto-fills using the project's standard defaults (e.g., Stock: 7%, Property: 3%, Inflation: 3%).
        *   "I have my own views" -> Reveals inputs for Stock Growth % and Property Growth %.

### 4. Output
- Upon completion, the wizard MUST:
    1.  Populate the `engine.js` input model with the gathered data.
    2.  Enable/Disable the relevant Strategies (A-F) based on answers.
    3.  Close the modal and reveal the Dashboard with the calculated results.

## Non-Functional Requirements
- **Responsiveness:** The wizard MUST be fully usable on mobile devices (large touch targets).
- **Tone:** Empowering and Friendly. Use simple language (e.g., "Spare Room" instead of "Rent-a-Room Relief").

## Out of Scope
- Account creation/Login (Local Storage only).
- Detailed "Stress Test" configuration inside the wizard (leave that for the main dashboard).
