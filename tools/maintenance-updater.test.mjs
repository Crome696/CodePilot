import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAINTENANCE_DEPENDENCIES,
  assertAllowlistedDependencies,
  assertCleanWorkingTree,
  buildUpdateArguments,
  findMajorVersionChanges,
  lockfilePackageVersion,
  majorVersion,
} from './maintenance-updater.mjs';

test('the maintenance allowlist contains only direct quality and test tooling', () => {
  assert.ok(MAINTENANCE_DEPENDENCIES.includes('nx'));
  assert.ok(MAINTENANCE_DEPENDENCIES.includes('prettier'));
  assert.ok(MAINTENANCE_DEPENDENCIES.includes('typescript'));
  assert.ok(MAINTENANCE_DEPENDENCIES.includes('@playwright/test'));
  assert.equal(
    new Set(MAINTENANCE_DEPENDENCIES).size,
    MAINTENANCE_DEPENDENCIES.length,
  );
});

test('dirty working trees are rejected', () => {
  assert.doesNotThrow(() => assertCleanWorkingTree(''));
  assert.throws(
    () => assertCleanWorkingTree(' M package.json\n'),
    /working tree is dirty/,
  );
});

test('the allowlist must remain a subset of direct devDependencies', () => {
  const devDependencies = Object.fromEntries(
    MAINTENANCE_DEPENDENCIES.map((dependency) => [dependency, '1.0.0']),
  );

  assert.doesNotThrow(() => assertAllowlistedDependencies({ devDependencies }));
  assert.throws(
    () =>
      assertAllowlistedDependencies({ devDependencies: { prettier: '1.0.0' } }),
    /undeclared devDependencies/,
  );
});

test('the repository manifest declares every allowlisted dependency directly', () => {
  const packageJson = JSON.parse(
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'),
      'utf8',
    ),
  );

  assert.doesNotThrow(() => assertAllowlistedDependencies(packageJson));
});

test('npm update arguments are constrained to the allowlist and ignore lifecycle scripts', () => {
  const args = buildUpdateArguments(['prettier', 'typescript']);

  assert.deepEqual(args, [
    'update',
    '--save-dev',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    'prettier',
    'typescript',
  ]);
});

test('lockfile package versions are read from npm package entries', () => {
  const lockfile = {
    packages: {
      'node_modules/prettier': { version: '3.6.2' },
    },
  };

  assert.equal(lockfilePackageVersion(lockfile, 'prettier'), '3.6.2');
  assert.equal(lockfilePackageVersion(lockfile, 'typescript'), null);
});

test('major-version changes are detected while minor updates remain allowed', () => {
  const before = {
    packages: {
      'node_modules/prettier': { version: '3.6.2' },
      'node_modules/typescript': { version: '6.0.3' },
    },
  };
  const after = {
    packages: {
      'node_modules/prettier': { version: '3.7.0' },
      'node_modules/typescript': { version: '7.0.0' },
    },
  };

  assert.equal(majorVersion('3.7.0'), 3);
  assert.deepEqual(findMajorVersionChanges(before, after), [
    { dependency: 'typescript', before: '6.0.3', after: '7.0.0' },
  ]);
});
