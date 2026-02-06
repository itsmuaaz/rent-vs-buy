# Track Specification: Dynamic Financial Auto-Adjustments

## Goal
To implement "Smart Inputs" that reduce cognitive load by automatically balancing related financial fields. This prevents users from having to do mental math (e.g., converting Deposit % to £) and ensures the simulation remains internally consistent (e.g., maintaining a constant monthly budget).

## Context
Currently, inputs are independent. If a user increases their Rent, their Savings remain the same, inadvertently increasing their total implied budget. Similarly, users must calculate Deposit £ manually if they only know the %, or vice versa.

## Functional Requirements

### 1. Total Monthly Budget Lock (Rent vs. Savings)
- **UI:** Add a checkbox "🔒 Lock Total Budget" near the Rent/Savings inputs. **Checked by default.**
- **Logic:**
    - If **Locked**: Increasing `Rent` automatically decreases `Monthly Savings` (and vice-versa) to keep the sum constant.
    - If **Unlocked**: Fields behave independently.
    - *Constraint:* Savings cannot go below zero. If Rent increases beyond Total Budget, Savings hits 0 and Total Budget expands.

### 2. Dual-Mode Inputs (Syncing Pairs)
For specific financial ratios, provide two inputs that stay in sync. Editing one updates the other based on the asset price.

- **Home Deposit:**
    - Inputs: `Deposit (%)` and `Deposit (£)`.
    - Logic: `£ = Price * %`. ` % = £ / Price`.
- **BTL Rent:**
    - Inputs: `Yield (%)` and `Monthly Rent (£)`.
    - Logic: `Rent = (Price * Yield) / 12`. `Yield = (Rent * 12) / Price`.

### 3. Smart Estimates (Buying Costs)
- **Trigger:** When `Property Price` changes.
- **Logic:** Automatically update `Buying Fees (£)` to a default estimate (e.g., ~1.5% - 2% of Price covers Solicitor + Surveyor) **UNLESS** the user has manually edited the field (dirty state).
- **Override:** If the user manually types a value, stop auto-updating it for that session.

## Non-Functional Requirements
- **Performance:** Updates must be perceived as instantaneous.
- **Precision:** Handle rounding gracefully (e.g., avoid 14.999999% loops). Round to nearest pound or 1 decimal place for %.

## Out of Scope
- Auto-balancing Stock/Property growth rates based on "Risk Profile" (saved for a future track).
