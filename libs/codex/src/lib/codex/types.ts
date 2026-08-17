export type CodexMode = 'plan' | 'execute';
export type CodexOutputFormat = 'text' | 'jsonl';
export type CodexReasoningEffort = 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | (string & {});
export type CodexModel = string;
export interface CodexRunInput { readonly prompt: string; readonly model?: CodexModel; readonly mode?: CodexMode; readonly reasoningEffort?: CodexReasoningEffort; readonly planModeReasoningEffort?: CodexReasoningEffort; readonly resume?: string; readonly workspace?: string; readonly cwd?: string; readonly outputFormat?: CodexOutputFormat; readonly sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access'; readonly skipGitRepoCheck?: boolean; readonly ephemeral?: boolean; readonly timeoutMs?: number; readonly cancellation?: AbortSignal; readonly extraArgs?: readonly string[]; readonly env?: NodeJS.ProcessEnv; }
export interface CommandExecutionOptions { readonly timeoutMs?: number; readonly cwd?: string; readonly env?: NodeJS.ProcessEnv; readonly signal?: AbortSignal; }
export interface CommandExecutionResult { readonly exitCode: number; readonly stdout: string; readonly stderr: string; readonly durationMs: number; }
export interface CodexCommandRunnerLike { execute(args: readonly string[], options?: CommandExecutionOptions): Promise<CommandExecutionResult>; }
export interface CodexCliClientOptions { readonly runner?: CodexCommandRunnerLike; readonly executable?: string; readonly timeoutMs?: number; readonly cwd?: string; readonly env?: NodeJS.ProcessEnv; }
export interface CodexHealth { readonly cli: { readonly available: true; readonly version: string }; readonly authentication: { readonly status: 'authenticated' | 'unauthenticated' | 'unknown'; readonly diagnostic: string | null }; readonly canRun: boolean; }
export interface CodexModelSummary { readonly id: string; readonly name: string | null; readonly raw: unknown; }
export interface CodexThreadStartedEvent { readonly type: 'thread.started'; readonly threadId: string | null; readonly raw: unknown; }
export interface CodexTurnStartedEvent { readonly type: 'turn.started'; readonly raw: unknown; }
export interface CodexAssistantEvent { readonly type: 'assistant'; readonly text: string; readonly raw: unknown; }
export interface CodexPlanEvent { readonly type: 'plan'; readonly text: string; readonly raw: unknown; }
export interface CodexReasoningEvent { readonly type: 'reasoning'; readonly text: string; readonly raw: unknown; }
export interface CodexToolEvent { readonly type: 'tool'; readonly toolName: string | null; readonly status: string | null; readonly text: string; readonly raw: unknown; }
export interface CodexUsageEvent { readonly type: 'usage'; readonly inputTokens: number | null; readonly outputTokens: number | null; readonly raw: unknown; }
export interface CodexResultEvent { readonly type: 'result'; readonly text: string; readonly threadId: string | null; readonly raw: unknown; }
export interface CodexCompletionEvent { readonly type: 'completion'; readonly success: boolean; readonly raw: unknown; }
export interface CodexUnknownEvent { readonly type: 'unknown'; readonly eventType: string; readonly raw: unknown; }
export type CodexStreamEvent = CodexThreadStartedEvent | CodexTurnStartedEvent | CodexAssistantEvent | CodexPlanEvent | CodexReasoningEvent | CodexToolEvent | CodexUsageEvent | CodexResultEvent | CodexCompletionEvent | CodexUnknownEvent;
export interface CodexRunResult { readonly text: string; readonly threadId: string | null; readonly model: string | null; readonly mode: CodexMode; readonly outputFormat: CodexOutputFormat; readonly events: readonly CodexStreamEvent[]; readonly raw: unknown; }
export type CodexErrorCategory = 'validation' | 'cli_unavailable' | 'authentication' | 'permission' | 'invalid_model' | 'timeout' | 'cancelled' | 'cli_exit' | 'parse' | 'configuration' | 'unknown';
export interface CodexError { readonly category: CodexErrorCategory; readonly operation: string; readonly message: string; readonly exitCode?: number; readonly stderr?: string; }
export type CodexResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: CodexError };
