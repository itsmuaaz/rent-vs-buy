# Specification: Conductor Context Synchronization

## Problem
Currently, Conductor tracks manage the active development state, but `GEMINI.md` and `README.md` contain static, often outdated "Roadmap" or "Key Features" sections. This creates a split-brain problem where the agent's core context (`GEMINI.md`) contradicts the actual project state (`conductor/tracks.md`).

## Goal
Implement a protocol where completing a Conductor track or phase automatically triggers updates to:
1.  `GEMINI.md` (Agent Context)
2.  `README.md` (Project Documentation)

## Requirements
1.  **Workflow Update:** `conductor/workflow.md` must include a "Documentation Sync" step in its closure protocols.
2.  **Context Pointer:** `GEMINI.md` should be refactored to explicitly point to Conductor for "active work" rather than maintaining a duplicate list.
3.  **Readme Alignment:** `README.md` should reflect the *current* released state, not future plans, to avoid confusion.

## Success Criteria
- [ ] `conductor/workflow.md` contains the new sync protocol.
- [ ] `GEMINI.md` "Future Roadmap" section is replaced with a dynamic reference or instructions to check Conductor.
- [ ] A clear process exists for updating `README.md` features when a track completes.
