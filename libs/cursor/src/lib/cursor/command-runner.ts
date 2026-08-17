import { spawn } from 'node:child_process';
import { CursorCommandRunnerError } from './errors';
import type {
  CommandExecutionOptions,
  CommandExecutionResult,
  CursorCommandRunnerLike,
} from './types';

export interface CursorCommandRunnerOptions {
  readonly executable?: string;
  readonly timeoutMs?: number;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Runs Cursor Agent without a shell. Consumers can inject this boundary in
 * tests so command construction and parsing never require a live account.
 */
export class CursorCommandRunner implements CursorCommandRunnerLike {
  private readonly executable: string;
  private readonly timeoutMs: number;
  private readonly cwd: string | undefined;
  private readonly env: NodeJS.ProcessEnv | undefined;

  constructor(options: CursorCommandRunnerOptions = {}) {
    this.executable = options.executable ?? 'agent';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.cwd = options.cwd;
    this.env = options.env;
  }

  execute(
    args: readonly string[],
    options: CommandExecutionOptions = {},
  ): Promise<CommandExecutionResult> {
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const cwd = options.cwd ?? this.cwd;
    const env =
      options.env === undefined && this.env === undefined
        ? process.env
        : { ...process.env, ...this.env, ...options.env };

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      let stdout = '';
      let stderr = '';
      let settled = false;
      let timerHandle: ReturnType<typeof setTimeout> | undefined;

      const clearTimer = (): void => {
        if (timerHandle !== undefined) {
          clearTimeout(timerHandle);
          timerHandle = undefined;
        }
      };

      const settleWithError = (error: CursorCommandRunnerError): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimer();
        reject(error);
      };

      const child = spawn(this.executable, [...args], {
        cwd,
        env,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stdout?.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.once('error', (error: Error & { code?: string }) => {
        const code =
          error.code === 'ENOENT' ? 'executable_unavailable' : 'spawn_error';
        settleWithError(
          new CursorCommandRunnerError(
            code,
            error.code === 'ENOENT'
              ? `The Cursor CLI executable '${this.executable}' is unavailable.`
              : error.message,
          ),
        );
      });

      child.once('close', (exitCode: number | null) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimer();
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
        });
      });

      timerHandle = setTimeout(() => {
        child.kill();
        settleWithError(
          new CursorCommandRunnerError(
            'timeout',
            `The Cursor CLI command exceeded the ${timeoutMs}ms timeout.`,
          ),
        );
      }, timeoutMs);
    });
  }
}
