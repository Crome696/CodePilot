import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const MAINTENANCE_DEPENDENCIES = Object.freeze([
  '@analogjs/vite-plugin-angular',
  '@analogjs/vitest-angular',
  '@angular-devkit/core',
  '@angular-devkit/schematics',
  '@angular/build',
  '@angular/cli',
  '@angular/compiler-cli',
  '@angular/language-service',
  '@nx/angular',
  '@nx/devkit',
  '@nx/eslint',
  '@nx/eslint-plugin',
  '@nx/js',
  '@nx/playwright',
  '@nx/vite',
  '@nx/vitest',
  '@nx/web',
  '@playwright/test',
  '@vitest/coverage-v8',
  '@vitest/ui',
  'angular-eslint',
  'eslint',
  'eslint-config-prettier',
  'eslint-plugin-playwright',
  'nx',
  'prettier',
  'typescript',
  'typescript-eslint',
  'vitest',
]);

function executable(command) {
  return process.platform === 'win32' && command === 'npm'
    ? 'npm.cmd'
    : command;
}

export function majorVersion(version) {
  const match = /^(\d+)(?:\.|$)/.exec(version ?? '');
  return match ? Number(match[1]) : null;
}

export function assertCleanWorkingTree(status) {
  if (status.trim() !== '') {
    throw new Error(
      'Refusing maintenance update because the working tree is dirty. Commit or stash all changes first.',
    );
  }
}

export function assertAllowlistedDependencies(packageJson) {
  const missing = MAINTENANCE_DEPENDENCIES.filter(
    (dependency) => !packageJson.devDependencies?.[dependency],
  );

  if (missing.length > 0) {
    throw new Error(
      `Refusing maintenance update because the allowlist contains undeclared devDependencies: ${missing.join(', ')}.`,
    );
  }
}

export function lockfilePackageVersion(lockfile, packageName) {
  const packageEntry = lockfile.packages?.[`node_modules/${packageName}`];
  return packageEntry?.version ?? null;
}

export function buildUpdateArguments(dependencies = MAINTENANCE_DEPENDENCIES) {
  return [
    'update',
    '--save-dev',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    ...dependencies,
  ];
}

export function findMajorVersionChanges(beforeLockfile, afterLockfile) {
  return MAINTENANCE_DEPENDENCIES.flatMap((dependency) => {
    const before = lockfilePackageVersion(beforeLockfile, dependency);
    const after = lockfilePackageVersion(afterLockfile, dependency);
    const beforeMajor = majorVersion(before);
    const afterMajor = majorVersion(after);

    if (
      beforeMajor === null ||
      afterMajor === null ||
      afterMajor <= beforeMajor
    ) {
      return [];
    }

    return [{ dependency, before, after }];
  });
}

function run(command, args, cwd, options = {}) {
  const result = spawnSync(executable(command), args, {
    cwd,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
    shell: false,
  });

  if (result.error) {
    throw new Error(
      `${command} ${args.join(' ')} failed to start: ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    throw new Error(
      `${command} ${args.join(' ')} exited with status ${result.status}${output ? `:\n${output}` : '.'}`,
    );
  }

  return result.stdout?.trim() ?? '';
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function runMaintenance({ cwd = process.cwd() } = {}) {
  const repositoryRoot = run('git', ['rev-parse', '--show-toplevel'], cwd);
  const packageJsonPath = join(repositoryRoot, 'package.json');
  const packageLockPath = join(repositoryRoot, 'package-lock.json');
  const packageJson = readJson(packageJsonPath);

  if (packageJson.packageLock === false) {
    throw new Error(
      'Refusing maintenance update because package-lock.json is disabled.',
    );
  }
  assertAllowlistedDependencies(packageJson);

  const status = run(
    'git',
    ['status', '--porcelain=v1', '--untracked-files=all'],
    repositoryRoot,
  );
  assertCleanWorkingTree(status);

  const beforeLockfile = readJson(packageLockPath);
  console.log(
    `Updating ${MAINTENANCE_DEPENDENCIES.length} allowlisted quality dependencies...`,
  );
  run('npm', buildUpdateArguments(), repositoryRoot, { inherit: true });

  const afterLockfile = readJson(packageLockPath);
  const majorChanges = findMajorVersionChanges(beforeLockfile, afterLockfile);
  if (majorChanges.length > 0) {
    const details = majorChanges
      .map(
        ({ dependency, before, after }) =>
          `${dependency} ${before} -> ${after}`,
      )
      .join(', ');
    throw new Error(
      `Refusing automatic major upgrade(s): ${details}. Review the lockfile diff manually.`,
    );
  }

  console.log('Running the complete quality check...');
  run('npm', ['run', 'quality'], repositoryRoot, { inherit: true });
  console.log('Maintenance update completed. No commit or push was performed.');
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedFile && currentFile === invokedFile) {
  try {
    runMaintenance({ cwd: dirname(currentFile) });
  } catch (error) {
    console.error(
      `[maintenance] ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error(
      '[maintenance] Review the working-tree diff and resolve the reported failure before committing.',
    );
    process.exitCode = 1;
  }
}
