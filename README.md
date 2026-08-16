# CodePilot

## Development

CodePilot is an Nx monorepo managed with npm. It contains the Angular
application `web` in `apps/web`, the Playwright project `web-e2e` in
`apps/web-e2e`, and the shared Angular libraries `ui` and `data` in `libs/`.

### Install

```bash
npm install
```

### Serve the web application

```bash
npm exec -- nx serve web
```

The application is available at `http://localhost:4200`.

### Build the web application

```bash
npm exec -- nx build web
```

The production build is written to `dist/web`.

### Run tests

```bash
npm exec -- nx test web
npm exec -- nx test ui
npm exec -- nx test data
```

### Inspect the project graph

```bash
npm exec -- nx show projects
npm exec -- nx graph
```

The `web` application imports the public APIs of `ui` and `data`, so the Nx
project graph includes dependencies from `web` to both libraries.
