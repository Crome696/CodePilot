# Cursor CLI integration

This library is the server-side Cursor Agent boundary for CodePilot. It uses
the installed `agent` executable as the transport and credential boundary;
`cursor-agent` can be selected explicitly for older installations. Browser
code never spawns processes and callers do not pass API keys through this API.

## Usage

```ts
import { CursorCliClient } from 'cursor';

const cursor = new CursorCliClient();

const plan = await cursor.plan({
  prompt: 'Create an implementation plan for the selected GitHub issue.',
  model: {
    id: 'GPT-5.6 Sol',
    reasoningLevel: 'extra-high',
    fast: true,
  },
  capabilities: {
    skills: ['development:typescript-docs-reference'],
    plugins: ['github'],
    mcpServers: ['github'],
    rules: ['AGENTS.md'],
  },
});

if (plan.ok) {
  const implementation = await cursor.run({
    prompt: 'Implement the approved plan and run the relevant checks.',
    model: 'GPT-5.6 Sol Extra High Fast',
    resume: plan.data.sessionId ?? undefined,
    force: true,
  });
}
```

The client also exposes `ask()` for read-only exploration, `health()` for CLI
and authentication diagnostics, `listModels()`, and `listMcpServers()`.

## Model and reasoning control

Cursor exposes model selection through its single `--model` option. The
library therefore supports both forms:

- a raw string for the exact identifier accepted by the installed CLI;
- a typed selection with `id`, `reasoningLevel`, and `fast`, which produces a
  human-readable Cursor model variant such as `GPT-5.6 Sol Extra High Fast`.

For a version-specific model slug, use the raw string. For an exact full
variant value, use `variant`:

```ts
model: {
  id: 'gpt-5.6',
  variant: 'gpt-5.6-sol-extra-high-fast',
}
```

There is intentionally no invented `--reasoning` flag. Reasoning/thinking is
represented by the model variant that the installed Cursor CLI supports.

## Plans, skills, plugins, and MCP

`plan()` maps to Cursor's `--mode=plan`; `ask()` maps to `--mode=ask`. The
returned session id can be passed to `resume` for the implementation step.
`run()` also supports `outputFormat: 'text' | 'json' | 'stream-json'` and
normalizes Cursor's JSON/NDJSON result events into `CursorRunResult`.

The `capabilities` option adds an explicit selection block to the prompt for
skills, plugins, MCP servers, subagents, rules, and files. Cursor remains
responsible for discovering the installed capabilities from the selected
workspace and for enforcing permissions; this library does not install,
enable, or impersonate them. Use `extraArgs` for a newer CLI option that is
not yet represented by the typed API, except credential flags, which are
rejected deliberately.

## Runtime and testing

The default runner uses Node's `child_process.spawn` with `shell: false`.
Inject `CursorCommandRunner` in tests to verify arguments and parsing without a
live Cursor account. Credentials stay in Cursor's normal login flow or
`CURSOR_API_KEY`; this library never calls login/logout and never prints them.

Run the library checks from the workspace root:

```bash
npx nx test cursor
npx nx lint cursor
npx tsc -p libs/cursor/tsconfig.lib.json --noEmit
```
