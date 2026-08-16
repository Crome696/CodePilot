# CodePilot

## Development

CodePilot is an Nx monorepo managed with pnpm. It contains the Angular
application `web` and the shared Angular libraries `ui` and `data`.

### Install

```bash
pnpm install
```

### Serve the web application

```bash
pnpm nx serve web
```

The application is available at `http://localhost:4200`.

### Build the web application

```bash
pnpm nx build web
```

The production build is written to `dist/web`.

### Run tests

```bash
pnpm nx test web
pnpm nx test ui
pnpm nx test data
```

### Inspect the project graph

```bash
pnpm nx show projects
pnpm nx graph
```

The `web` application imports the public APIs of `ui` and `data`, so the Nx
project graph includes dependencies from `web` to both libraries.
