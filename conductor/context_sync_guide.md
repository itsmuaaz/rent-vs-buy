# Conductor Context Synchronization Guide

This guide defines the protocol for synchronizing the Agent's Context (`GEMINI.md`) and the Project Documentation (`README.md`) with the active state of Conductor tracks.

## 1. When to Sync?
Synchronize documentation **ONLY** at the following trigger points:
- **Phase Checkpoint:** When a major phase of a track is completed.
- **Track Completion:** When an entire track is marked as `[x]`.

## 2. GEMINI.md (Agent Context)
The `GEMINI.md` file defines the agent's understanding of the project. To prevent "split-brain" issues (where the file contradicts the actual codebase state), follow these rules:

### Rules:
1.  **NO Future Plans:** Do not hardcode future features in `GEMINI.md`. Use `conductor/tracks.md` for that.
2.  **Pointer to Truth:** The "Roadmap" section must explicitly point to Conductor files.
3.  **Active Focus:** If a track is active, `GEMINI.md` can optionally mention the *current high-level goal*, but detailed tasks must remain in the track's `plan.md`.

### Template Section:
```markdown
## 🚧 Active Development
*   **Current Track:** [Name of Active Track]
*   **Source of Truth:** For detailed tasks and status, refer to `conductor/tracks.md`.
*   **Do Not Edit:** Do not manually add tasks here. Use the Conductor CLI.
```

## 3. README.md (User Documentation)
The `README.md` file is for **end-users** and **external developers**. It must reflect the *shipped* state of the project.

### Rules:
1.  **Shipped Features Only:** Only list features that are merged and working.
2.  **No "Planned" Features:** Avoid listing features that don't exist yet, unless clearly marked as "Coming Soon".
3.  **Status Badge:** Maintain a link to the active development track or a status badge.

### Update Process:
When a track completes a user-facing feature:
1.  Move the feature from the "Planned" list (if any) to the "Features" list in `README.md`.
2.  Update screenshots or usage instructions if the UI changed.
3.  Add a note to the "Changelog" (if you maintain one).

## 4. Synchronization Checklist
Before marking a track as `[x] Complete`:

- [ ] **GEMINI.md:** Does it still reference the completed track as "Active"? -> Update it to point to the next track or "Maintenance".
- [ ] **GEMINI.md:** Are there any new "Core Mandates" or "Architecture" rules discovered during this track? -> Add them.
- [ ] **README.md:** Is the new feature documented?
- [ ] **README.md:** Are the installation/usage instructions still accurate?
