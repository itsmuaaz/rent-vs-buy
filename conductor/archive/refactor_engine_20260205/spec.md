# Track Specification: Engine Refactor (OO & JSDoc)

## Goal
To refactor the core financial logic (`engine.js`) from a procedural, functional approach into a robust, Object-Oriented Design (OOD) using the **Strategy Pattern**. This will improve code maintainability, extensibility, and type safety (via JSDoc).

## Context
The current `engine.js` uses a single monolithic function `simulateStrategies` with multiple `if/else` blocks to handle different scenarios (Rent, Buy, BTL, Hybrid). This makes it brittle and hard to extend.

## Requirements

### 1. Architecture
- **Base Class:** Create an abstract base class `Strategy` that defines the interface for all financial strategies.
    - Properties: `name`, `netWorth` (Array), `liquidHistory` (Array), `breakdown` (Object).
    - Methods: `simulateStep(month)`, `calculateExit(year)`, `getResults()`.
- **Subclasses:**
    - `RentStrategy`: Implements logic for Rent & Invest.
    - `BuyStrategy`: Implements logic for Buying a Home (Mortgage + Equity).
    - `BTLStrategy`: Implements logic for Investment Property (Personal or Ltd Co).
    - `HybridStrategy`: (Optional) Composes multiple strategies if needed (e.g., Home + BTL).
- **Factory:** A `StrategyFactory` to instantiate the correct classes based on user input.

### 2. Type Safety
- **JSDoc:** All classes and methods must be fully documented with JSDoc annotations (`@param`, `@returns`, `@type`).
- **Types:** Define shared types (e.g., `TaxRates`, `SimulationInput`, `SimulationResult`) in a central JSDoc definition or at the top of the file.

### 3. Compatibility
- The external API `Engine.simulateStrategies(input)` must remain backward compatible (or be adapted via a wrapper) so `app.js` and `index.html` do not break immediately.
- **Testing:** The existing `engine.test.js` must pass with 100% parity.

## Files to Modify
- `engine.js`: Complete rewrite (internal structure).
- `engine.test.js`: Update if internal unit tests change, but integration tests should remain valid.

## Definition of Done
- `engine.js` is class-based.
- JSDoc covers 100% of public methods.
- `npm test` passes.
- No regression in calculation outputs.
