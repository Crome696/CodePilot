# GitHub CLI integration

This library is the server-side GitHub boundary for CodePilot. It uses the
installed `gh` executable as the transport and credential boundary; callers do
not provide tokens and browser code does not spawn processes or assemble CLI
commands.

## Usage

```ts
import { GitHubCliClient } from 'github';

const github = new GitHubCliClient();
const health = await github.health();

if (health.ok && health.canRead) {
  const issues = await github.listIssues({
    repository: 'Crome696/CodePilot',
    state: 'open',
    limit: 50,
  });
}
```

Every operation requires an explicit `owner/repository` target and returns a
typed `GitHubResult<T>`. Failures are categorized as validation, CLI
availability, authentication, permission, missing resource, conflict,
timeout, non-zero CLI exit, or parse errors. Diagnostic text is sanitized and
credentials are never accepted, persisted, or returned.

## Operation mapping

| Contract                   | GitHub CLI boundary                                                      |
| -------------------------- | ------------------------------------------------------------------------ |
| Health and authentication  | `gh --version`, `gh auth status`                                         |
| Issue list/retrieve        | `gh issue list/view --json`                                              |
| Issue create/update/delete | `gh api` with JSON request bodies; delete uses `DELETE` and never closes |
| Pull-request list/retrieve | `gh pr list/view --json`                                                 |
| Pull-request review/merge  | `gh api` review and merge endpoints for structured results               |
| Commit list/retrieve       | `gh api repos/{owner}/{repo}/commits`                                    |
| Milestones                 | `gh api repos/{owner}/{repo}/milestones`                                 |

Commit and milestone list requests support `--paginate --slurp` through the
typed pagination inputs. Pull-request and issue filters use the dedicated
`gh` list commands and their supported `--limit` pagination behavior.

## Runtime and testing

The library is server-side only because its default runner uses Node's
`child_process.spawn` with `shell: false`. Inject `GitHubCommandRunner` in
unit tests to verify arguments, JSON request bodies, parsing, pagination, and
error handling without a live GitHub account. Mutating operations are not run
by the normal test suite.

Run the library checks from the workspace root:

```bash
npx nx test github
npx nx lint github
npx tsc -p libs/github/tsconfig.lib.json --noEmit
```

For opt-in manual verification, configure the local GitHub CLI through its
normal credential flow outside this library, then run the health check from a
server-side process. A read-only smoke check can use the public repository
target shown below; do not run mutating methods against a shared repository by
default:

```ts
const result = await new GitHubCliClient().health();
console.log(result.ok ? result.data.authentication : result.error.category);
```

The library never calls `gh auth login` or `gh auth logout`, and it never
prints or persists the credential managed by `gh`.
