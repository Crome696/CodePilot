import type {
  CommandExecutionResult,
  GitHubError,
  GitHubResult,
} from './types';

export type CommandRunnerErrorCode =
  | 'executable_unavailable'
  | 'timeout'
  | 'spawn_error';

export class CommandRunnerError extends Error {
  readonly code: CommandRunnerErrorCode;

  constructor(code: CommandRunnerErrorCode, message: string) {
    super(message);
    this.name = 'CommandRunnerError';
    this.code = code;
  }
}

export function success<T>(data: T): GitHubResult<T> {
  return { ok: true, data };
}

export function failure<T>(error: GitHubError): GitHubResult<T> {
  return { ok: false, error };
}

export function validationFailure<T>(
  operation: string,
  message: string,
): GitHubResult<T> {
  return failure({
    category: 'validation',
    operation,
    message,
  });
}

export function parseFailure<T>(
  operation: string,
  message: string,
): GitHubResult<T> {
  return failure({
    category: 'parse',
    operation,
    message,
  });
}

export function sanitizeDiagnostic(value: string): string {
  return value
    .replace(
      new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g'),
      '',
    )
    .replace(
      /\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g,
      '[redacted-token]',
    )
    .replace(
      /((?:token|secret|password|authorization)\s*[:=]\s*)\S+/gi,
      '$1[redacted]',
    )
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 500);
}

export function commandRunnerFailure<T>(
  operation: string,
  error: unknown,
): GitHubResult<T> {
  if (error instanceof CommandRunnerError) {
    const category =
      error.code === 'executable_unavailable'
        ? 'cli_unavailable'
        : error.code === 'timeout'
          ? 'timeout'
          : 'unknown';

    return failure({
      category,
      operation,
      message: sanitizeDiagnostic(error.message),
    });
  }

  return failure({
    category: 'unknown',
    operation,
    message: 'The GitHub CLI command runner failed unexpectedly.',
  });
}

export function cliExitFailure<T>(
  operation: string,
  result: CommandExecutionResult,
): GitHubResult<T> {
  const diagnostic = sanitizeDiagnostic(
    result.stderr ||
      result.stdout ||
      'The GitHub CLI returned a non-zero exit code.',
  );
  const normalized = diagnostic.toLowerCase();
  let category: GitHubError['category'] = 'cli_exit';

  if (
    /not logged in|authentication|authenticat|invalid token|token.*invalid/.test(
      normalized,
    )
  ) {
    category = 'authentication';
  } else if (
    /forbidden|permission|not authorized|resource not accessible|must have/.test(
      normalized,
    )
  ) {
    category = 'permission';
  } else if (/not found|could not resolve|does not exist/.test(normalized)) {
    category = 'not_found';
  } else if (
    /conflict|cannot be merged|branch protection|merge conflict/.test(
      normalized,
    )
  ) {
    category = 'conflict';
  }

  return failure({
    category,
    operation,
    message: diagnostic,
    exitCode: result.exitCode,
    stderr: diagnostic || undefined,
  });
}

export function jsonFailure<T>(
  operation: string,
  error: unknown,
): GitHubResult<T> {
  const message =
    error instanceof Error ? error.message : 'Invalid JSON output.';
  return failure({
    category: 'parse',
    operation,
    message: `The GitHub CLI returned invalid JSON: ${sanitizeDiagnostic(message)}`,
  });
}
