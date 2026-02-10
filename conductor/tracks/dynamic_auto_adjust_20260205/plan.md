# Implementation Plan: Dynamic Financial Auto-Adjustments

## Phase 1: State Management & Event Logic [checkpoint: 0e05a8f]
- [x] Task: Extend `app.js` data model. e85c380
    - [ ] Add `lockedBudget` (boolean, default true).
    - [ ] Add `totalBudget` (computed property).
    - [ ] Add `homeDepositAmount` and `btlRentAmount` to the model.
- [x] Task: Create a generic "Sync" helper. 75c7dcd
    - [ ] Function `syncInputs(source, target, formula)` to handle the bidirectional updates without infinite loops.

## Phase 2: Budget Lock Implementation [checkpoint: e523c41]
- [x] Task: Update `index.html` UI for Personal Section. deb7652
    - [x] Add "Lock Total Budget" checkbox.
    - [x] Add tooltips explaining the behavior.
- [x] Task: Implement `watch` logic in `app.js`. 85fe23c
    - [x] Watch `rent.current`: If locked, update `monthlySavings`.
    - [x] Watch `monthlySavings`: If locked, update `rent.current`.
- [x] Task: Write Unit Tests. 85fe23c
    - [x] Verify locking logic maintains the sum.
    - [x] Verify unlocking allows independent changes.

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
