# Implementation Plan: Dynamic Financial Auto-Adjustments

## Phase 1: State Management & Event Logic
- [ ] Task: Extend `app.js` data model.
    - [ ] Add `lockedBudget` (boolean, default true).
    - [ ] Add `totalBudget` (computed property).
    - [ ] Add `homeDepositAmount` and `btlRentAmount` to the model.
- [ ] Task: Create a generic "Sync" helper.
    - [ ] Function `syncInputs(source, target, formula)` to handle the bidirectional updates without infinite loops.

## Phase 2: Budget Lock Implementation
- [ ] Task: Update `index.html` UI for Personal Section.
    - [ ] Add "Lock Total Budget" checkbox.
    - [ ] Add tooltips explaining the behavior.
- [ ] Task: Implement `watch` logic in `app.js`.
    - [ ] Watch `rent.current`: If locked, update `monthlySavings`.
    - [ ] Watch `monthlySavings`: If locked, update `rent.current`.
- [ ] Task: Write Unit Tests.
    - [ ] Verify locking logic maintains the sum.
    - [ ] Verify unlocking allows independent changes.

## Phase 3: Dual-Mode Inputs Implementation
- [ ] Task: Update `index.html` for Home Section.
    - [ ] Add `Deposit (£)` input next to `%`.
    - [ ] Implement sync logic (Price * % = £).
- [ ] Task: Update `index.html` for BTL Section.
    - [ ] Add `Monthly Rent (£)` input next to `Yield %`.
    - [ ] Implement sync logic.
- [ ] Task: Verify Rounding & Precision.
    - [ ] Ensure no floating point jitters.

## Phase 4: Smart Estimates (Buying Costs)
- [ ] Task: Implement "Dirty State" tracking.
    - [ ] Track if `home.buyingCost` has been manually touched.
- [ ] Task: Implement Auto-Update Logic.
    - [ ] When `home.price` changes, if !dirty, set `buyingCost = price * 0.015`.
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
