# CodePilot UI

The `ui` library provides the reusable Angular presentation layer for
CodePilot. It follows Brad Frost's Atomic Design model and exposes all layers
from the library entry point at `libs/ui/src/index.ts`.

## Layers

- `atoms/` — single primitive controls and display elements such as buttons,
  badges, cards, inputs, avatars, status dots, separators, and navigation
  items.
- `molecules/` — compact compositions with one focused responsibility, such
  as repository search and workspace profile.
- `organisms/` — reusable sections such as the workspace sidebar, repository
  header, and foundation panel.
- `templates/` — structure-first page shells. `dashboard-shell` owns the
  sidebar, header, and content projection regions, but no route or page copy.
- `apps/web/src/app/pages/` — concrete page composition stays in the web
  application. The Overview page supplies page-specific copy and preserves
  the existing static data dependency.

Every component keeps its TypeScript class, HTML template, CSS, and focused
unit test colocated. Atoms and reusable compositions use typed signal inputs,
native semantics, token-backed styles, and declarative content projection.
