export type CodexCommandRunnerErrorCode = 'executable_unavailable' | 'timeout' | 'cancelled' | 'spawn_error';
export class CodexCommandRunnerError extends Error { readonly code: CodexCommandRunnerErrorCode; constructor(code: CodexCommandRunnerErrorCode, message: string) { super(message); this.name = 'CodexCommandRunnerError'; this.code = code; } }
