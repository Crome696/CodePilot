These AGENTS.md instructions replace all previously provided AGENTS.md instructions.

# Global Codex Instructions

- Use only skills that are available in the current runtime and whose `SKILL.md`
  exists at the resolved path. Do not reference or invoke a missing skill.
- Use only plugins that are installed and exposed by the current runtime. Do
  not treat recommended or cached-but-unavailable plugins as installed.
- If a requested skill or plugin is missing, state that briefly and continue
  with the best available fallback.
- Mention every skill actually used for the current request in the chat.

--- project-doc ---

## Learned User Preferences

- User prefers Cursor plans in German; repository and published artifacts should remain in English unless explicitly requested otherwise.

## Learned Workspace Facts

- CodePilot is intended as a small tool for creating, maintaining, and managing Git repositories through AI command-line adapters such as Codex CLI and Cursor CLI, with room for additional adapters.
- CodePilot's intended web product links GitHub repositories and provides dashboard-like views for issues, pull requests, commits, and branches.
- The product direction includes connectivity validation for GitHub, Cursor, and Codex, plus prompt-backed buttons that can be flexibly bound to existing views.

## Git synchronization rule

- Before creating a new GitHub issue or starting work to implement an issue, always synchronize with the current `master`: fetch/pull the latest `origin/master`, then rebase the implementation branch or dedicated worktree onto `origin/master`. Verify the resulting base SHA before continuing, and stop if synchronization produces conflicts or another in-progress Git operation.
