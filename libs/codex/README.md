# Codex CLI integration

This server-side library runs the installed Codex CLI without a shell and
normalizes `codex exec --json` JSONL events into typed CodePilot results.
Credentials remain managed by Codex; this library never accepts or persists
credentials and browser code must not invoke it directly.

It supports health checks, model selection, plan/execute prompts, reasoning
config overrides, JSONL events, session resume, timeout, cancellation, and
injected command runners for deterministic tests.
