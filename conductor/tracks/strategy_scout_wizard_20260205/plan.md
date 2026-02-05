# Implementation Plan: Strategy Scout (Wizard Mode)

## Phase 1: Architecture & State Management
- [ ] Task: Create `wizard.js` module.
    - [ ] Define `WizardComponent` as a standalone Alpine.js data object.
    - [ ] Implement `steps` configuration array to define the question flow (making it easy to reorder/add steps later).
- [ ] Task: Integrate `wizard.js` into `index.html` and `app.js`.
    - [ ] Load the script.
    - [ ] Add the `x-data="wizard()"` scope to the modal container.
- [ ] Task: Implement "First Visit" detection service.
    - [ ] Create a small helper function to check `localStorage` and toggle the wizard visibility.

## Phase 2: UI Implementation (The View)
- [ ] Task: Create the Reusable Modal Shell.
    - [ ] Full-screen overlay, responsive container, "Close" button.
    - [ ] Progress Bar that calculates width based on `currentStep / totalSteps`.
- [ ] Task: Create a "Dynamic Question Renderer".
    - [ ] Use `x-for` to render the current step's input fields (Number, Toggle, Select) based on the configuration in `wizard.js`.
    - [ ] *Why:* This avoids hardcoding 50 lines of HTML for every new question.

## Phase 3: Logic & Flow (The Controller)
- [ ] Task: Implement Step 1 (Basics) Configuration.
    - [ ] Add config for Rent, Assets, Savings.
- [ ] Task: Implement Step 2 (Home & Lodger) with Conditional Logic.
    - [ ] Add logic: If "Buy Home" is unchecked, hide Property Price input.
- [ ] Task: Implement Step 3 (BTL Discovery).
    - [ ] Add logic: If "Compare Both" is selected, set a flag to enable Strategy D & E.
- [ ] Task: Implement Step 4 (Market Assumptions).
    - [ ] Add "Quick Fill" action to populate defaults.

## Phase 4: Integration & Polish
- [ ] Task: Implement "Apply & Calculate".
    - [ ] Function to map Wizard State -> Main Engine State.
    - [ ] Graceful transition (close modal -> show results).
- [ ] Task: Add "Start Strategy Scout" entry point.
- [ ] Task: Conductor - User Manual Verification 'Integration & Polish' (Protocol in workflow.md)
