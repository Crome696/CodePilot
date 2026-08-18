import { existsSync } from 'node:fs';
import { delimiter, isAbsolute, join } from 'node:path';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_TIMEOUT_MS = 120_000;

export function sanitizeDiagnostic(value) {
  return String(value ?? '')
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(
      /\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g,
      '[redacted-token]',
    )
    .replace(
      /\b(?:sk|key|token|secret|password|auth)[-_]?[A-Za-z0-9]*\s*[:=]\s*\S+/gi,
      '[redacted-credential]',
    )
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 500);
}

export function commandLabel(executable, args) {
  return [executable, ...args].join(' ');
}

export function isMain(metaUrl, argv1 = process.argv[1]) {
  if (argv1 === undefined) return false;
  return (
    path.resolve(argv1).toLowerCase() ===
    path.resolve(fileURLToPath(metaUrl)).toLowerCase()
  );
}

export function buildSpawnInvocation(
  executable,
  args,
  { platform = process.platform, comSpec = process.env.ComSpec } = {},
) {
  if (platform !== 'win32' || !/\.(?:cmd|bat)$/i.test(executable)) {
    return { executable, args };
  }

  return {
    executable: comSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', executable, ...args],
  };
}

function resolvePowerShellScript(executable, env) {
  if (!/\.cmd$/i.test(executable)) {
    return null;
  }

  const script = executable.replace(/\.cmd$/i, '.ps1');
  const candidates = isAbsolute(executable)
    ? [script]
    : (env.Path ?? env.PATH ?? '')
        .split(delimiter)
        .filter(Boolean)
        .map((directory) => join(directory, script));

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function buildSpawnCommand(executable, args, options = {}) {
  if (
    process.platform !== 'win32' ||
    options.windowsPowerShell !== true ||
    !/\.cmd$/i.test(executable)
  ) {
    return { executable, args };
  }

  const script = resolvePowerShellScript(
    executable,
    options.env ?? process.env,
  );
  if (script === null) {
    return null;
  }

  const systemRoot = options.env?.SystemRoot ?? process.env.SystemRoot;
  const powershell = systemRoot
    ? join(
        systemRoot,
        'System32',
        'WindowsPowerShell',
        'v1.0',
        'powershell.exe',
      )
    : 'powershell.exe';

  return {
    executable: powershell,
    args: [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      script,
      ...args,
    ],
  };
}

function classifyExit(output) {
  const normalized = sanitizeDiagnostic(output).toLowerCase();
  if (
    /not logged in|authentication|unauthori[sz]ed|invalid token|api key/.test(
      normalized,
    )
  )
    return 'authentication';
  if (
    /invalid model|unknown model|model .*not (?:available|valid)/.test(
      normalized,
    )
  )
    return 'invalid_model';
  return 'non_zero_exit';
}

export function runCommand(executable, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const spawnImpl = options.spawnImpl ?? spawn;

  return new Promise((resolve) => {
    const startedAt = Date.now();
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, durationMs: Date.now() - startedAt });
    };

    const command =
      options.windowsPowerShell === true
        ? buildSpawnCommand(executable, args, options)
        : buildSpawnInvocation(executable, args, {
            platform: options.platform,
            comSpec: env.ComSpec,
          });
    if (command === null) {
      finish({
        ok: false,
        kind: 'cli_unavailable',
        message: `${executable} has no PowerShell launcher.`,
      });
      return;
    }

    let child;
    try {
      child = spawnImpl(command.executable, command.args, {
        cwd,
        env,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      finish({
        ok: false,
        kind: 'spawn_error',
        message: sanitizeDiagnostic(error?.message),
      });
      return;
    }

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.once('error', (error) => {
      finish({
        ok: false,
        kind: error?.code === 'ENOENT' ? 'cli_unavailable' : 'spawn_error',
        message: sanitizeDiagnostic(
          error?.code === 'ENOENT'
            ? `${executable} was not found.`
            : error?.message,
        ),
        stdout,
        stderr,
      });
    });
    child.once('close', (exitCode) => {
      finish({
        ok: exitCode === 0,
        kind: exitCode === 0 ? 'success' : classifyExit(`${stderr}\n${stdout}`),
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
      });
    });
    timer = setTimeout(() => {
      child.kill();
      finish({
        ok: false,
        kind: 'timeout',
        message: `${executable} exceeded ${timeoutMs}ms.`,
        stdout,
        stderr,
      });
    }, timeoutMs);
  });
}

export function diagnosticFor(result) {
  return sanitizeDiagnostic(
    result.message ||
      result.stderr ||
      result.stdout ||
      `exit code ${result.exitCode ?? 'unknown'}`,
  );
}

export function printFailure(adapter, result) {
  console.error(
    `[${adapter}] FAIL: ${result.kind ?? 'error'}: ${diagnosticFor(result)}`,
  );
}
