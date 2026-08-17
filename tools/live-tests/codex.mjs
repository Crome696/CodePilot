import { fileURLToPath } from 'node:url';
import { diagnosticFor, printFailure, runCommand } from './common.mjs';

export const CODEX_MODEL = 'gpt 5.6 Luna (low)';
export const CODEX_EXECUTABLE =
  process.platform === 'win32' ? 'codex.cmd' : 'codex';
export const CODEX_PROMPT =
  'Respond with exactly one short confirmation. Do not modify files, run commands, use tools, or access external systems.';

export function buildCodexCommand() {
  return {
    executable: CODEX_EXECUTABLE,
    args: [
      'exec',
      '--model',
      CODEX_MODEL,
      '--json',
      '--sandbox',
      'read-only',
      '--ephemeral',
      CODEX_PROMPT,
    ],
  };
}

export function parseJsonl(stdout) {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) throw new Error('codex returned empty JSONL output.');
  return lines.map((line) => JSON.parse(line));
}

export async function runCodexLive({ runner = runCommand } = {}) {
  const command = buildCodexCommand();
  console.log(
    `[codex] Starting ephemeral read-only check with model ${CODEX_MODEL}.`,
  );
  const result = await runner(command.executable, command.args);
  if (!result.ok) {
    printFailure('codex', result);
    return 1;
  }
  let events;
  try {
    events = parseJsonl(result.stdout);
  } catch (error) {
    printFailure('codex', {
      ...result,
      kind: 'malformed_output',
      message: error.message,
    });
    return 1;
  }
  console.log(
    `[codex] PASS: model invocation ${CODEX_MODEL}; read-only ephemeral session; ${events.length} JSONL event(s).`,
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCodexLive()
    .then((code) => (process.exitCode = code))
    .catch((error) => {
      console.error(`[codex] FAIL: ${diagnosticFor(error)}`);
      process.exitCode = 1;
    });
}
