import type {
  CommandExecutionResult,
  CursorErrorCategory,
  CursorError,
  CursorResult,
} from './types';

export type CursorCommandRunnerErrorCode =
  | 'executable_unavailable'
  | 'timeout'
  | 'spawn_error';

export class CursorCommandRunnerError extends Error {
  readonly code: CursorCommandRunnerErrorCode;

  constructor(code: CursorCommandRunnerErrorCode, message: string) {
    super(message);
    this.name = 'CursorCommandRunnerError';
    this.code = code;
  }
}

export function success<T>(data: T): CursorResult<T> {
  return { ok: true, data };
}

export function failure<T>(error: CursorError): CursorResult<T> {
  return { ok: false, error };
}

export function validationFailure<T>(
  operation: string,
  message: string,
): CursorResult<T> {
  return failure({
    category: 'validation',
    operation,
    message,
  });
}

export function parseFailure<T>(
  operation: string,
  message: string,
): CursorResult<T> {
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
      /\b(?:crsr_|cursor[_-]?token[_-]?|cursor_pat_)[A-Za-z0-9_./=-]+\b/gi,
      '[redacted-token]',
    )
    .replace(
      /((?:cursor_api_key|api[-_ ]?key|token|secret|password|authorization)\s*[:=]\s*)\S+/gi,
      '$1[redacted]',
    )
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 500);
}

export function commandRunnerFailure<T>(
  operation: string,
  error: unknown,
): CursorResult<T> {
  if (error instanceof CursorCommandRunnerError) {
    const category: CursorErrorCategory =
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
    message: 'The Cursor CLI command runner failed unexpectedly.',
  });
}

export function cliExitFailure<T>(
  operation: string,
  result: CommandExecutionResult,
): CursorResult<T> {
  const diagnostic = sanitizeDiagnostic(
    result.stderr ||
      result.stdout ||
      'The Cursor CLI returned a non-zero exit code.',
  );
  const normalized = diagnostic.toLowerCase();
  let category: CursorErrorCategory = 'cli_exit';

  if (
    /not logged in|authentication|authenticat|invalid (?:api )?key|api key.*invalid|unauthorized/.test(
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
  } else if (
    /invalid model|unknown model|model.*not available|model name.*not valid|model.*not valid/.test(
      normalized,
    )
  ) {
    category = 'invalid_model';
  } else if (/not found|could not resolve|does not exist/.test(normalized)) {
    category = 'not_found';
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
): CursorResult<T> {
  const message =
    error instanceof Error ? error.message : 'Invalid JSON output.';
  return failure({
    category: 'parse',
    operation,
    message: `The Cursor CLI returned invalid JSON: ${sanitizeDiagnostic(message)}`,
  });
}
