# Product Brief

## Problem

Codex-heavy builders often hand a PRD or high-level task to Codex, then receive a "done" response without a clear product-level audit trail. They need to know which feature changed, whether the change matches the PRD, and what evidence supports it.

## Target User

Hackathon builders, solo founders, and product engineers who rely on Codex to implement feature work quickly.

## Core Insight

Codex writes code in files, but users reason about product features. cocanvas connects file-level activity back to PRD-level intent.

## Product Promise

cocanvas shows which product features changed, why they changed, and whether they are verified.

## MVP Scope

- Paste a PRD.
- Generate a small feature graph.
- Replay mock Codex events.
- Update feature states live.
- Show evidence, risk, and placeholder actions in an inspector.
- Keep adapters clean so mock, `codex exec --json`, and future App Server events share one event contract.

## Non-Goals

- Production authentication.
- Persistent database.
- Perfect PRD parsing.
- Full static analysis.
- Complete App Server integration.
- Multi-user collaboration.
- Full redo/fork workflow.
