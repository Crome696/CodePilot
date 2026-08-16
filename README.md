# CodePilot

## Development

CodePilot is an Nx monorepo managed with npm. It contains the Angular
application `web` in `apps/web`, the Playwright project `web-e2e` in
`apps/web-e2e`, and the shared Angular libraries `ui` and `data` in `libs/`.

### Prerequisites

The reference development environment uses Node.js `24.15.0` and npm
`11.12.1`. The workspace declares the supported Node.js engine range
`^22.22.3 || ^24.15.0 || >=26.0.0` and requires npm `>=8`.

### Install

For a clean checkout, install the exact lockfile dependencies with:

```bash
npm ci
```

### Supported npm scripts

The root scripts are the shared command contract for terminals, VS Code, and
Cursor:

```bash
npm run projects
npm run build
npm run serve
npm run serve:static
npm run lint
npm run test
npm run e2e:install
npm run e2e
```

The development server is available at `http://localhost:4200`. The
production build is written to `dist/web`.

Playwright browsers must be installed once before the E2E workflow is run:

```bash
npm run e2e:install
npm run e2e
```

### Nx diagnostics

The equivalent direct Nx commands are useful when diagnosing project and
target discovery:

```bash
npm exec -- nx show projects
npm exec -- nx show project web
npm exec -- nx show project web-e2e
npm exec -- nx run web:build
```

The project list must contain `web`, `web-e2e`, `ui`, and `data`. The
Playwright plugin infers the `e2e` target for `web-e2e` from its
`playwright.config.mts` file.

### Target contract

| Project | Supported targets | Not applicable |
| --- | --- | --- |
| `web` | `build`, `serve`, `serve-static`, `lint`, `test` | `e2e` |
| `ui` | `lint`, `test` | `build`, `serve`, `serve-static`, `e2e` |
| `data` | `lint`, `test` | `build`, `serve`, `serve-static`, `e2e` |
| `web-e2e` | plugin-inferred `lint`, plugin-inferred `e2e` | `build`, `serve`, `serve-static`, `test` |

`ui` and `data` are source-only libraries. They are consumed by the `web`
application and are not separate packaged build outputs, so the application
build does not depend on undeclared library `build` targets.

### Editor tasks

VS Code and Cursor consume the same `.vscode/tasks.json` file. Use **Tasks:
Run Task** and select one of the `CodePilot:` tasks for Build, Serve, Static
Serve, Lint, Test, or E2E. Each task invokes the corresponding root npm
script, so editor execution follows the same contract as terminal execution.
