# CodePilot

## Development

CodePilot is an Nx monorepo managed with npm. It contains the Angular
application `web` in `apps/web`, the Playwright project `web-e2e` in
`apps/web-e2e`, the shared Angular libraries `ui` and `data`, and the
server-side `github` and `cursor` CLI libraries in `libs/`.

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

The project list must contain `web`, `web-e2e`, `ui`, `data`, `github`, and
`cursor`; the Playwright plugin infers the `e2e` target for `web-e2e` from its
`playwright.config.mts` file.

### Quality checks

The repository-owned quality commands are:

```bash
npm run lint
npm run format:check
npm run format:write
npm run security:check
npm run quality
```

`npm run quality` runs linting, the read-only Prettier check, the high-severity
dependency audit, maintenance-updater tests, and the Nx unit-test targets.
Formatting changes are intentionally a separate opt-in operation through
`npm run format:write`.

### Local pre-commit hook

Install the tracked hook once per checkout:

```bash
git config core.hooksPath .githooks
```

The hook runs `npm run lint` and `npm run format:check` before every commit.
It is intentionally local and does not contact GitHub or create any commit on
its own.

### Scheduled dependency maintenance

`npm run maintenance:update` updates only the allowlisted quality and test
tooling within the existing semver ranges, including the lockfile. The current
allowlist covers Nx and Angular/Nx builders, ESLint and its TypeScript/Prettier
integration, Prettier, TypeScript, Vitest, and Playwright. It refuses to start
when the working tree is dirty, rejects an observed major-version change, runs
the complete quality check afterwards, and never commits or pushes changes.

Run it manually from the repository root:

```bash
npm run maintenance:update
```

For Windows Task Scheduler, create a recurring task that starts in the
repository directory and runs `npm.cmd` with the argument
`run maintenance:update`. Use a user account that can read and write the
checkout, and review the resulting `package.json`/`package-lock.json` diff
before committing the update.

### Target contract

| Project   | Supported targets                                | Not applicable                           |
| --------- | ------------------------------------------------ | ---------------------------------------- |
| `web`     | `build`, `serve`, `serve-static`, `lint`, `test` | `e2e`                                    |
| `ui`      | `lint`, `test`                                   | `build`, `serve`, `serve-static`, `e2e`  |
| `data`    | `lint`, `test`                                   | `build`, `serve`, `serve-static`, `e2e`  |
| `github`  | `lint`, `test`                                   | `build`, `serve`, `serve-static`, `e2e`  |
| `cursor`  | `lint`, `test`                                   | `build`, `serve`, `serve-static`, `e2e`  |
| `web-e2e` | plugin-inferred `lint`, plugin-inferred `e2e`    | `build`, `serve`, `serve-static`, `test` |

`ui`, `data`, `github`, and `cursor` are source-only libraries. The Angular
libraries are consumed by the `web` application; `github` and `cursor` are
consumed by server-side CodePilot integrations. None are separate packaged
build outputs, so the application build does not depend on undeclared library
`build` targets.

### Editor tasks

VS Code and Cursor consume the same `.vscode/tasks.json` file. Use **Tasks:
Run Task** and select one of the `CodePilot:` tasks for Build, Serve, Static
Serve, Lint, Test, or E2E. Each task invokes the corresponding root npm
script, so editor execution follows the same contract as terminal execution.
