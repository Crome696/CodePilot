import { fileURLToPath } from 'node:url';
import { diagnosticFor, printFailure, runCommand } from './common.mjs';

export const CURSOR_MODEL = 'Auto';
export const CURSOR_EXECUTABLE =
  process.platform === 'win32' ? 'agent.cmd' : 'agent';
export const CURSOR_PROMPT =
  'Answer with exactly: CodePilot Cursor live check passed. Do not modify files, run commands, use tools, or access external systems.';

export function buildCursorCommand() {
  return {
    executable: CURSOR_EXECUTABLE,
    args: [
      '--print',
      '--output-format',
      'json',
      '--mode=ask',
      '--model',
      CURSOR_MODEL,
      CURSOR_PROMPT,
    ],
  };
}

function responseText(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  for (const key of ['result', 'text', 'message', 'content']) {
    const text = responseText(value[key]);
    if (text) return text;
  }
  return '';
}

export async function runCursorLive({ runner = runCommand } = {}) {
  const command = buildCursorCommand();
  console.log(
    `[cursor] Starting read-only agent check with model ${CURSOR_MODEL}.`,
  );
  const result = await runner(command.executable, command.args);
  if (!result.ok) {
    printFailure('cursor', result);
    return 1;
  }
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    printFailure('cursor', {
      ...result,
      kind: 'malformed_output',
      message: 'agent returned invalid JSON.',
    });
    return 1;
  }
  const text = responseText(parsed);
  if (!text) {
    printFailure('cursor', {
      ...result,
      kind: 'malformed_output',
      message: 'agent returned an empty response.',
    });
    return 1;
  }
  console.log(
    `[cursor] PASS: model invocation ${CURSOR_MODEL}; non-empty response received.`,
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCursorLive()
    .then((code) => (process.exitCode = code))
    .catch((error) => {
      console.error(`[cursor] FAIL: ${diagnosticFor(error)}`);
      process.exitCode = 1;
    });
}
