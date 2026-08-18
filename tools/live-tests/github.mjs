import { diagnosticFor, isMain, printFailure, runCommand } from './common.mjs';

export const REPOSITORY = 'Crome696/CodePilot';

export function buildGithubCommands() {
  return [
    { executable: 'gh', args: ['--version'] },
    { executable: 'gh', args: ['auth', 'status', '--hostname', 'github.com'] },
    {
      executable: 'gh',
      args: [
        'repo',
        'view',
        REPOSITORY,
        '--json',
        'nameWithOwner,url,viewerPermission',
      ],
    },
  ];
}

export async function runGithubLive({ runner = runCommand } = {}) {
  console.log('[github] Starting read-only GitHub CLI check.');
  const [versionCommand, authCommand, repositoryCommand] =
    buildGithubCommands();
  const version = await runner(versionCommand.executable, versionCommand.args);
  if (!version.ok) {
    printFailure('github', version);
    return 1;
  }
  const versionText = version.stdout.match(/gh version\s+([^\s]+)/i)?.[1];
  if (!versionText) {
    printFailure('github', {
      ...version,
      kind: 'malformed_output',
      message: 'gh version output was not recognized.',
    });
    return 1;
  }

  const auth = await runner(authCommand.executable, authCommand.args);
  if (!auth.ok) {
    printFailure('github', auth);
    return 1;
  }
  const account =
    auth.stdout.match(/account\s+([A-Za-z0-9][A-Za-z0-9-]*)/i)?.[1] ??
    'unknown';

  const repository = await runner(
    repositoryCommand.executable,
    repositoryCommand.args,
  );
  if (!repository.ok) {
    printFailure('github', repository);
    return 1;
  }
  let details;
  try {
    details = JSON.parse(repository.stdout);
  } catch {
    printFailure('github', {
      ...repository,
      kind: 'malformed_output',
      message: 'repository query returned invalid JSON.',
    });
    return 1;
  }
  if (!details.nameWithOwner || !details.url || !details.viewerPermission) {
    printFailure('github', {
      ...repository,
      kind: 'malformed_output',
      message: 'repository query omitted required fields.',
    });
    return 1;
  }

  console.log(
    `[github] PASS: gh ${versionText}; authenticated account ${account}; ${details.nameWithOwner}; ${details.url}; permission ${details.viewerPermission}.`,
  );
  return 0;
}

if (isMain(import.meta.url)) {
  runGithubLive()
    .then((code) => (process.exitCode = code))
    .catch((error) => {
      console.error(`[github] FAIL: ${diagnosticFor(error)}`);
      process.exitCode = 1;
    });
}
