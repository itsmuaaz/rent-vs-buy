# Implementation Plan: Engine Refactor

## Phase 1: Preparation & Typing
- [x] Task: Create `engine.d.js` (or JSDoc definitions in `engine.js`) to define the data structures (Input Model, Results). [9f9547c]
    - [ ] Define `TaxRates`, `PersonalConfig`, `HomeConfig`, `BTLConfig`.
    - [ ] Define `SimulationResult` interface.

## Phase 2: Base Strategy Architecture
- [ ] Task: Implement the `Strategy` base class in `engine.js`.
    - [ ] Define constructor and common properties (`netWorth`, `liquid`, `deadMoney`).
    - [ ] Implement skeleton methods (`simulateMonth`, `getExitVal`).
- [ ] Task: Implement `RentStrategy` subclass.
    - [ ] Migrate logic from "Strategy A" block in `simulateStrategies`.
    - [ ] Write unit test to verify `RentStrategy` matches old logic.

## Phase 3: Property Strategies
- [ ] Task: Implement `BuyStrategy` subclass.
    - [ ] Migrate logic from "Strategy B/C" (Home & Lodger).
    - [ ] Handle Mortgage, Stamp Duty, and Maintenance logic.
- [ ] Task: Implement `BTLStrategy` subclass.
    - [ ] Migrate logic from "Strategy D/E" (Personal & Ltd Co).
    - [ ] Handle Section 24 and Corporation Tax logic.

## Phase 4: Integration & Regression
- [ ] Task: Create `StrategyFactory` or `Engine` wrapper.
    - [ ] Re-implement `simulateStrategies` to use the new Classes.
- [ ] Task: Verify Regression.
    - [ ] Run `npm test` to ensure all existing snapshots match.
- [ ] Task: Conductor - User Manual Verification 'Integration & Regression' (Protocol in workflow.md)
