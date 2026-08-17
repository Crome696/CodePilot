import { spawn } from 'node:child_process';
import { CommandRunnerError } from './errors';
import type {
  CommandExecutionOptions,
  CommandExecutionResult,
  GitHubCommandRunner,
} from './types';

export interface GhCommandRunnerOptions {
  readonly executable?: string;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Runs the GitHub CLI without a shell. Consumers inject this boundary in
 * tests so command construction and parsing never require a live account.
 */
export class GhCommandRunner implements GitHubCommandRunner {
  private readonly executable: string;
  private readonly timeoutMs: number;

  constructor(options: GhCommandRunnerOptions = {}) {
    this.executable = options.executable ?? 'gh';
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  execute(
    args: readonly string[],
    options: CommandExecutionOptions = {},
  ): Promise<CommandExecutionResult> {
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;

    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      let stdout = '';
      let stderr = '';
      let settled = false;
      const timerHandle: { current?: ReturnType<typeof setTimeout> } = {};

      const settleWithError = (error: CommandRunnerError): void => {
        if (settled) {
          return;
        }
        settled = true;
        if (timerHandle.current !== undefined) {
          clearTimeout(timerHandle.current);
        }
        reject(error);
      };

      const child = spawn(this.executable, [...args], {
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
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
          new CommandRunnerError(
            code,
            error.code === 'ENOENT'
              ? `The GitHub CLI executable '${this.executable}' is unavailable.`
              : error.message,
          ),
        );
      });

      child.once('close', (exitCode: number | null) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timerHandle.current !== undefined) {
          clearTimeout(timerHandle.current);
        }
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr,
          durationMs: Date.now() - startedAt,
        });
      });

      const timer = setTimeout(() => {
        child.kill();
        settleWithError(
          new CommandRunnerError(
            'timeout',
            `The GitHub CLI command exceeded the ${timeoutMs}ms timeout.`,
          ),
        );
      }, timeoutMs);
      timerHandle.current = timer;

      if (options.input !== undefined) {
        child.stdin?.end(options.input);
      } else {
        child.stdin?.end();
      }
    });
  }
}
