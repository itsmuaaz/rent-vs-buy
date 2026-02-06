# Implementation Plan: Engine Refactor

## Phase 1: Preparation & Typing
- [x] Task: Create `engine.d.js` (or JSDoc definitions in `engine.js`) to define the data structures (Input Model, Results). [9f9547c]
    - [ ] Define `TaxRates`, `PersonalConfig`, `HomeConfig`, `BTLConfig`.
    - [ ] Define `SimulationResult` interface.

## Phase 2: Base Strategy Architecture
- [x] Task: Implement the `Strategy` base class in `engine.js`. [5440261]
    - [ ] Define constructor and common properties (`netWorth`, `liquid`, `deadMoney`).
    - [ ] Implement skeleton methods (`simulateMonth`, `getExitVal`).
- [x] Task: Implement `RentStrategy` subclass. [fce13c3]
    - [ ] Migrate logic from "Strategy A" block in `simulateStrategies`.
    - [ ] Write unit test to verify `RentStrategy` matches old logic.
- [x] Task: Conductor - User Manual Verification 'Base Strategy Architecture' (Protocol in workflow.md) [checkpoint: da6d670]

## Phase 3: Property Strategies
- [x] Task: Implement `BuyStrategy` subclass. [95b8b05]
    - [ ] Migrate logic from "Strategy B/C" (Home & Lodger).
    - [ ] Handle Mortgage, Stamp Duty, and Maintenance logic.
- [x] Task: Implement `BTLStrategy` subclass. [941480c]
    - [ ] Migrate logic from "Strategy D/E" (Personal & Ltd Co).
    - [ ] Handle Section 24 and Corporation Tax logic.
- [x] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md) [checkpoint: 2def12a]

## Phase 4: Integration & Regression
- [x] Task: Create `StrategyFactory` or `Engine` wrapper. [e37c292]
    - [ ] Re-implement `simulateStrategies` to use the new Classes.
- [x] Task: Verify Regression.
    - [ ] Run `npm test` to ensure all existing snapshots match.
- [x] Task: Conductor - User Manual Verification 'Integration & Regression' (Protocol in workflow.md) [checkpoint: 40cc223]