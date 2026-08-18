import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGithubCommands, runGithubLive } from './live-tests/github.mjs';
import { buildCursorCommand, runCursorLive } from './live-tests/cursor.mjs';
import {
  buildSpawnInvocation,
  isMain,
  runCommand,
} from './live-tests/common.mjs';
import {
  buildCodexCommand,
  parseJsonl,
  runCodexLive,
} from './live-tests/codex.mjs';

test('CLI entrypoints resolve relative Windows and Unix script paths', () => {
  const entrypoint = new URL('./live-tests/codex.mjs', import.meta.url);
  const absoluteEntrypoint = fileURLToPath(entrypoint);
  const relativeEntrypoint = path.relative(process.cwd(), absoluteEntrypoint);

  assert.equal(isMain(entrypoint, relativeEntrypoint), true);
  assert.equal(isMain(entrypoint, absoluteEntrypoint), true);
});

test('Windows command shims run through ComSpec without enabling a shell', async () => {
  const calls = [];
  const spawnImpl = (executable, args, options) => {
    calls.push({ executable, args, options });
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {};
    queueMicrotask(() => child.emit('close', 0));
    return child;
  };

  const result = await runCommand('codex.cmd', ['--version'], {
    env: { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
    platform: 'win32',
    spawnImpl,
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].executable, 'C:\\Windows\\System32\\cmd.exe');
  assert.deepEqual(calls[0].args, ['/d', '/s', '/c', 'codex.cmd', '--version']);
  assert.equal(calls[0].options.shell, false);
});

test('non-Windows commands keep their direct spawn invocation', () => {
  assert.deepEqual(
    buildSpawnInvocation('codex', ['--version'], { platform: 'linux' }),
    { executable: 'codex', args: ['--version'] },
  );
});

const WINDOWS = process.platform === 'win32';

test('GitHub command sequence is read-only and targets CodePilot', () => {
  assert.deepEqual(buildGithubCommands(), [
    { executable: 'gh', args: ['--version'] },
    { executable: 'gh', args: ['auth', 'status', '--hostname', 'github.com'] },
    {
      executable: 'gh',
      args: [
        'repo',
        'view',
        'Crome696/CodePilot',
        '--json',
        'nameWithOwner,url,viewerPermission',
      ],
    },
  ]);
});

test('Cursor command pins Auto and forbids mutation', () => {
  const command = buildCursorCommand();
  assert.equal(command.executable, WINDOWS ? 'agent.cmd' : 'agent');
  assert.deepEqual(command.args.slice(0, 8), [
    '--print',
    '--output-format',
    'json',
    '--mode=ask',
    '--trust',
    '--model',
    'Auto',
    command.args[7],
  ]);
  assert.match(command.args.at(-1), /Do not modify files/);
  assert.ok(!command.args.includes('--force'));
  assert.ok(!command.args.includes('--yolo'));
});

test('Codex command pins the model and enforces read-only ephemeral execution', () => {
  const command = buildCodexCommand();
  assert.ok(command.args.includes('--ignore-user-config'));
  assert.deepEqual(command.args.slice(0, 8), [
    'exec',
    '--ignore-user-config',
    '--model',
    'gpt 5.6 Luna (low)',
    '--json',
    '--sandbox',
    'read-only',
    '--ephemeral',
  ]);
  assert.match(command.args.at(-1), /Do not modify files/);
});

test('each adapter can be diagnosed independently', async () => {
  const unavailable = async () => ({
    ok: false,
    kind: 'cli_unavailable',
    message: 'missing',
  });
  assert.equal(await runGithubLive({ runner: unavailable }), 1);
  assert.equal(await runCursorLive({ runner: unavailable }), 1);
  assert.equal(await runCodexLive({ runner: unavailable }), 1);
});

test('GitHub runner rejects malformed repository output', async () => {
  const runner = async (_executable, args) =>
    args[0] === '--version'
      ? { ok: true, stdout: 'gh version 2.80.0' }
      : args[0] === 'auth'
        ? { ok: true, stdout: 'Logged in to github.com account Crome696' }
        : { ok: true, stdout: '{}' };
  assert.equal(await runGithubLive({ runner }), 1);
});

test('Cursor runner rejects malformed output', async () => {
  assert.equal(
    await runCursorLive({ runner: async () => ({ ok: true, stdout: '{' }) }),
    1,
  );
});

test('Codex parser requires valid non-empty JSONL', () => {
  assert.deepEqual(parseJsonl('{"type":"result"}\n'), [{ type: 'result' }]);
  assert.throws(() => parseJsonl('not-json\n'));
  assert.throws(() => parseJsonl(''));
});
