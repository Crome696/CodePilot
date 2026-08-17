import { CursorCommandRunner } from './command-runner';
import {
  cliExitFailure,
  commandRunnerFailure,
  sanitizeDiagnostic,
  success,
} from './errors';
import {
  buildCapabilityPrompt,
  formatCursorModel,
  parseCursorMcpServers,
  parseCursorModels,
  parseCursorOutput,
  parseCursorVersion,
} from './parsers';
import { validateClientOptions, validateCursorRunInput } from './validation';
import type {
  CommandExecutionResult,
  CursorCliClientOptions,
  CursorCommandRunnerLike,
  CursorHealth,
  CursorMcpServer,
  CursorModelSummary,
  CursorResult,
  CursorRunInput,
  CursorRunResult,
  CursorOutputFormat,
} from './types';

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export function buildCursorCliArgs(
  input: CursorRunInput,
): CursorResult<readonly string[]> {
  const validation = validateCursorRunInput(input);
  if (!validation.ok) {
    return validation;
  }

  const outputFormat: CursorOutputFormat = input.outputFormat ?? 'json';
  const args: string[] = ['--print', '--output-format', outputFormat];
  const mode = input.plan === true ? 'plan' : input.mode;

  if (mode !== undefined && mode !== 'agent') {
    args.push(`--mode=${mode}`);
  }
  if (input.model !== undefined) {
    args.push('--model', formatCursorModel(input.model));
  }
  if (input.force === true) {
    args.push('--force');
  }
  if (input.yolo === true) {
    args.push('--yolo');
  }
  if (input.resume !== undefined) {
    args.push('--resume');
    if (typeof input.resume === 'string') {
      args.push(input.resume);
    }
  }
  if (input.continue === true) {
    args.push('--continue');
  }
  if (input.workspace !== undefined) {
    args.push('--workspace', input.workspace);
  }
  if (input.worktree !== undefined) {
    args.push('--worktree');
    if (typeof input.worktree === 'string') {
      args.push(input.worktree);
    }
  }
  if (input.streamPartialOutput === true) {
    args.push('--stream-partial-output');
  }
  args.push(...(input.extraArgs ?? []));
  args.push(buildCapabilityPrompt(input.prompt, input.capabilities));
  return success(args);
}

export class CursorCliClient {
  private readonly runner: CursorCommandRunnerLike;
  private readonly timeoutMs: number;
  private readonly cwd: string | undefined;
  private readonly env: NodeJS.ProcessEnv | undefined;

  constructor(options: CursorCliClientOptions = {}) {
    const validation = validateClientOptions(options);
    if (!validation.ok) {
      throw new TypeError(validation.error.message);
    }
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.cwd = options.cwd;
    this.env = options.env;
    this.runner =
      options.runner ??
      new CursorCommandRunner({
        executable: options.executable,
        timeoutMs: this.timeoutMs,
        cwd: options.cwd,
        env: options.env,
      });
  }

  async run(input: CursorRunInput): Promise<CursorResult<CursorRunResult>> {
    const operation = 'run';
    const validation = validateCursorRunInput(input, operation);
    if (!validation.ok) {
      return validation;
    }

    const args = buildCursorCliArgs(input);
    if (!args.ok) {
      return args;
    }

    const result = await this.runRaw(operation, args.data, {
      cwd: input.cwd ?? this.cwd,
      env: input.env ?? this.env,
      timeoutMs: input.timeoutMs,
    });
    if (!result.ok) {
      return result;
    }
    if (result.data.exitCode !== 0) {
      return cliExitFailure(operation, result.data);
    }

    return parseCursorOutput(
      result.data.stdout,
      input.outputFormat ?? 'json',
      operation,
    );
  }

  async plan(
    input: Omit<CursorRunInput, 'mode' | 'plan'>,
  ): Promise<CursorResult<CursorRunResult>> {
    return this.run({ ...input, mode: 'plan', plan: true });
  }

  async ask(
    input: Omit<CursorRunInput, 'mode' | 'plan'>,
  ): Promise<CursorResult<CursorRunResult>> {
    return this.run({ ...input, mode: 'ask', plan: false });
  }

  async health(): Promise<CursorResult<CursorHealth>> {
    const versionResult = await this.runRaw('health.cli_version', [
      '--version',
    ]);
    if (!versionResult.ok) {
      return versionResult;
    }
    if (versionResult.data.exitCode !== 0) {
      return cliExitFailure('health.cli_version', versionResult.data);
    }

    const version = parseCursorVersion(versionResult.data.stdout);
    if (!version.ok) {
      return version;
    }

    const authResult = await this.runRaw('health.status', ['status']);
    if (!authResult.ok) {
      return authResult;
    }

    const authOutput = `${authResult.data.stdout}\n${authResult.data.stderr}`;
    const authenticated = authResult.data.exitCode === 0;
    const diagnostic = sanitizeDiagnostic(authOutput);
    const status = authenticated
      ? 'authenticated'
      : /not logged in|invalid (?:api )?key|authentication|authenticat|unauthorized/i.test(
            authOutput,
          )
        ? 'unauthenticated'
        : 'unknown';

    return success({
      cli: { available: true, version: version.data },
      authentication: {
        status,
        diagnostic: authenticated ? null : diagnostic || null,
      },
      canRun: authenticated,
    });
  }

  async listModels(): Promise<CursorResult<readonly CursorModelSummary[]>> {
    const operation = 'models.list';
    const result = await this.runRaw(operation, ['models']);
    if (!result.ok) {
      return result;
    }
    if (result.data.exitCode !== 0) {
      return cliExitFailure(operation, result.data);
    }
    return parseCursorModels(result.data.stdout, operation);
  }

  async listMcpServers(): Promise<CursorResult<readonly CursorMcpServer[]>> {
    const operation = 'mcp.list';
    const result = await this.runRaw(operation, ['mcp', 'list']);
    if (!result.ok) {
      return result;
    }
    if (result.data.exitCode !== 0) {
      return cliExitFailure(operation, result.data);
    }
    return parseCursorMcpServers(result.data.stdout, operation);
  }

  private async runRaw(
    operation: string,
    args: readonly string[],
    options: {
      readonly cwd?: string;
      readonly env?: NodeJS.ProcessEnv;
      readonly timeoutMs?: number;
    } = {},
  ): Promise<CursorResult<CommandExecutionResult>> {
    try {
      const result = await this.runner.execute(args, {
        cwd: options.cwd,
        env: options.env,
        timeoutMs: options.timeoutMs ?? this.timeoutMs,
      });
      return success(result);
    } catch (error) {
      return commandRunnerFailure(operation, error);
    }
  }
}
