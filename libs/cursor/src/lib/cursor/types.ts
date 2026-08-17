export type CursorMode = 'agent' | 'plan' | 'ask';

export type CursorOutputFormat = 'text' | 'json' | 'stream-json';

/**
 * Cursor exposes reasoning as part of a selectable model variant rather than
 * as a separate CLI flag. The string form remains open so new Cursor variants
 * do not require a library release.
 */
export type CursorReasoningLevel =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'extra-high'
  | (string & {});

export interface CursorModelSelection {
  /** The model id or display name accepted by the installed Cursor CLI. */
  readonly id: string;
  /** Optional exact full variant value used instead of composing one. */
  readonly variant?: string;
  /** Reasoning/thinking variant label, for example `high` or `extra-high`. */
  readonly reasoningLevel?: CursorReasoningLevel;
  /** Request the fast variant when the selected model exposes one. */
  readonly fast?: boolean;
}

/** A raw model string is the escape hatch for version-specific Cursor names. */
export type CursorModel = string | CursorModelSelection;

export interface CursorCapabilitySelection {
  /** Skills already available to Cursor in the selected workspace. */
  readonly skills?: readonly string[];
  /** Plugins already installed or available to Cursor. */
  readonly plugins?: readonly string[];
  /** MCP server names configured for the workspace. */
  readonly mcpServers?: readonly string[];
  /** Named subagents that the prompt should make available to the run. */
  readonly subagents?: readonly string[];
  /** Rules or instruction files that should be treated as relevant context. */
  readonly rules?: readonly string[];
  /** Workspace files that should be explicitly included as context. */
  readonly files?: readonly string[];
}

export interface CursorRunInput {
  readonly prompt: string;
  readonly model?: CursorModel;
  readonly mode?: CursorMode;
  /** Shorthand for `mode: 'plan'`. */
  readonly plan?: boolean;
  readonly capabilities?: CursorCapabilitySelection;
  /** Defaults to `json` for stable programmatic consumption. */
  readonly outputFormat?: CursorOutputFormat;
  /** Allow write/terminal actions that would otherwise require approval. */
  readonly force?: boolean;
  /** Cursor's non-interactive approval shortcut. */
  readonly yolo?: boolean;
  readonly resume?: string | boolean;
  readonly continue?: boolean;
  /** Cursor workspace path passed to the CLI. */
  readonly workspace?: string;
  /** Use Cursor's isolated worktree support. */
  readonly worktree?: string | boolean;
  /** Emit partial stream output when supported by the installed CLI. */
  readonly streamPartialOutput?: boolean;
  /** Additional version-specific CLI flags, appended after library flags. */
  readonly extraArgs?: readonly string[];
  /** Process working directory; defaults to the client working directory. */
  readonly cwd?: string;
  /** Environment override used only by the child process. */
  readonly env?: NodeJS.ProcessEnv;
  readonly timeoutMs?: number;
}

export interface CommandExecutionOptions {
  readonly timeoutMs?: number;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
}

export interface CommandExecutionResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
}

export interface CursorCommandRunnerLike {
  execute(
    args: readonly string[],
    options?: CommandExecutionOptions,
  ): Promise<CommandExecutionResult>;
}

export interface CursorCliClientOptions {
  readonly runner?: CursorCommandRunnerLike;
  /** Defaults to `agent`; `cursor-agent` remains a supported alias. */
  readonly executable?: string;
  readonly timeoutMs?: number;
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
}

export interface CursorSystemEvent {
  readonly type: 'system';
  readonly subtype?: string;
  readonly sessionId: string | null;
  readonly model: string | null;
  readonly raw: unknown;
}

export interface CursorAssistantEvent {
  readonly type: 'assistant';
  readonly subtype?: string;
  readonly text: string;
  readonly sessionId: string | null;
  readonly raw: unknown;
}

export interface CursorToolCallEvent {
  readonly type: 'tool_call';
  readonly subtype?: string;
  readonly toolName: string | null;
  readonly status: string | null;
  readonly sessionId: string | null;
  readonly raw: unknown;
}

export interface CursorResultEvent {
  readonly type: 'result';
  readonly subtype?: string;
  readonly text: string;
  readonly sessionId: string | null;
  readonly requestId: string | null;
  readonly model: string | null;
  readonly durationMs: number | null;
  readonly durationApiMs: number | null;
  readonly raw: unknown;
}

export interface CursorUnknownEvent {
  readonly type: string;
  readonly raw: unknown;
}

export type CursorStreamEvent =
  | CursorSystemEvent
  | CursorAssistantEvent
  | CursorToolCallEvent
  | CursorResultEvent
  | CursorUnknownEvent;

export interface CursorRunResult {
  readonly text: string;
  readonly sessionId: string | null;
  readonly requestId: string | null;
  readonly model: string | null;
  readonly durationMs: number | null;
  readonly durationApiMs: number | null;
  readonly outputFormat: CursorOutputFormat;
  readonly events: readonly CursorStreamEvent[];
  readonly raw: unknown;
}

export type CursorAuthenticationStatus =
  | 'authenticated'
  | 'unauthenticated'
  | 'unknown';

export interface CursorHealth {
  readonly cli: {
    readonly available: true;
    readonly version: string;
  };
  readonly authentication: {
    readonly status: CursorAuthenticationStatus;
    readonly diagnostic: string | null;
  };
  readonly canRun: boolean;
}

export interface CursorModelSummary {
  readonly id: string;
  readonly name: string | null;
  readonly raw: unknown;
}

export interface CursorMcpServer {
  readonly name: string;
  readonly status: string | null;
  readonly raw: unknown;
}

export type CursorErrorCategory =
  | 'validation'
  | 'cli_unavailable'
  | 'authentication'
  | 'permission'
  | 'not_found'
  | 'invalid_model'
  | 'timeout'
  | 'cli_exit'
  | 'parse'
  | 'unknown';

export interface CursorError {
  readonly category: CursorErrorCategory;
  readonly operation: string;
  readonly message: string;
  readonly exitCode?: number;
  readonly stderr?: string;
}

export type CursorResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: CursorError };
