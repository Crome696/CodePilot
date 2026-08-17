import { validationFailure } from './errors';
import type {
  CursorCapabilitySelection,
  CursorCliClientOptions,
  CursorModel,
  CursorModelSelection,
  CursorResult,
  CursorRunInput,
} from './types';

function validateText(
  value: string,
  field: string,
  operation: string,
  required = false,
): CursorResult<string> {
  if (required && value.trim().length === 0) {
    return validationFailure(operation, `${field} must not be empty.`);
  }
  if (value.includes('\u0000')) {
    return validationFailure(
      operation,
      `${field} must not contain NUL characters.`,
    );
  }
  return { ok: true, data: value };
}

function validateCollection(
  values: readonly string[] | undefined,
  field: string,
  operation: string,
): CursorResult<undefined> | CursorResult<readonly string[]> {
  if (values === undefined) {
    return { ok: true, data: undefined };
  }
  for (const value of values) {
    if (value.trim().length === 0) {
      return validationFailure(
        operation,
        `${field} must not contain empty values.`,
      );
    }
    if (value.includes('\u0000')) {
      return validationFailure(
        operation,
        `${field} must not contain NUL characters.`,
      );
    }
  }
  return { ok: true, data: values };
}

function validateModel(
  model: CursorModel | undefined,
  operation: string,
): CursorResult<CursorModel | undefined> {
  if (model === undefined) {
    return { ok: true, data: undefined };
  }
  if (typeof model === 'string') {
    const validated = validateText(model, 'model', operation, true);
    return validated.ok ? { ok: true, data: validated.data } : validated;
  }

  const selection = model as CursorModelSelection;
  const id = validateText(selection.id, 'model.id', operation, true);
  if (!id.ok) {
    return id;
  }
  if (selection.variant !== undefined) {
    const variant = validateText(
      selection.variant,
      'model.variant',
      operation,
      true,
    );
    if (!variant.ok) {
      return variant;
    }
    if (
      selection.reasoningLevel !== undefined ||
      selection.fast !== undefined
    ) {
      return validationFailure(
        operation,
        'model.variant cannot be combined with reasoningLevel or fast.',
      );
    }
  }
  if (
    selection.reasoningLevel !== undefined &&
    selection.reasoningLevel.trim().length === 0
  ) {
    return validationFailure(
      operation,
      'model.reasoningLevel must not be empty.',
    );
  }
  return { ok: true, data: model };
}

function validateCapabilities(
  capabilities: CursorCapabilitySelection | undefined,
  operation: string,
): CursorResult<undefined> {
  if (capabilities === undefined) {
    return { ok: true, data: undefined };
  }

  for (const [field, values] of Object.entries(capabilities)) {
    const result = validateCollection(
      values as readonly string[] | undefined,
      `capabilities.${field}`,
      operation,
    );
    if (!result.ok) {
      return result;
    }
  }
  return { ok: true, data: undefined };
}

export function validateCursorRunInput(
  input: CursorRunInput,
  operation = 'run',
): CursorResult<CursorRunInput> {
  const prompt = validateText(input.prompt, 'prompt', operation, true);
  if (!prompt.ok) {
    return prompt;
  }

  const model = validateModel(input.model, operation);
  if (!model.ok) {
    return model;
  }

  const capabilities = validateCapabilities(input.capabilities, operation);
  if (!capabilities.ok) {
    return capabilities;
  }

  if (
    input.mode !== undefined &&
    !['agent', 'plan', 'ask'].includes(input.mode)
  ) {
    return validationFailure(
      operation,
      'mode must be one of: agent, plan, ask.',
    );
  }
  if (
    input.outputFormat !== undefined &&
    !['text', 'json', 'stream-json'].includes(input.outputFormat)
  ) {
    return validationFailure(
      operation,
      'outputFormat must be one of: text, json, stream-json.',
    );
  }
  if (
    input.plan === true &&
    input.mode !== undefined &&
    input.mode !== 'plan'
  ) {
    return validationFailure(
      operation,
      'plan can only be combined with mode=plan.',
    );
  }
  if (input.force === true && input.yolo === true) {
    return validationFailure(
      operation,
      'force and yolo are mutually exclusive.',
    );
  }
  if (input.force === true && (input.mode === 'plan' || input.plan === true)) {
    return validationFailure(operation, 'force is not valid for plan mode.');
  }
  if (input.yolo === true && (input.mode === 'plan' || input.plan === true)) {
    return validationFailure(operation, 'yolo is not valid for plan mode.');
  }
  if (input.resume !== undefined && input.continue === true) {
    return validationFailure(
      operation,
      'resume and continue are mutually exclusive.',
    );
  }
  if (typeof input.resume === 'string') {
    const resume = validateText(input.resume, 'resume', operation, true);
    if (!resume.ok) {
      return resume;
    }
  }
  if (
    input.streamPartialOutput === true &&
    input.outputFormat !== 'stream-json'
  ) {
    return validationFailure(
      operation,
      'streamPartialOutput requires outputFormat=stream-json.',
    );
  }
  if (
    input.timeoutMs !== undefined &&
    (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 1)
  ) {
    return validationFailure(
      operation,
      'timeoutMs must be a positive integer.',
    );
  }

  for (const [field, value] of [
    ['workspace', input.workspace],
    ['cwd', input.cwd],
  ] as const) {
    if (value !== undefined) {
      const result = validateText(value, field, operation, true);
      if (!result.ok) {
        return result;
      }
    }
  }
  if (typeof input.worktree === 'string') {
    const worktree = validateText(input.worktree, 'worktree', operation, true);
    if (!worktree.ok) {
      return worktree;
    }
  }

  for (const arg of input.extraArgs ?? []) {
    if (arg.includes('\u0000')) {
      return validationFailure(
        operation,
        'extraArgs must not contain NUL characters.',
      );
    }
  }
  const credentialFlag = (input.extraArgs ?? []).find(
    (arg) =>
      arg === '-a' || arg === '--api-key' || arg.startsWith('--api-key='),
  );
  if (credentialFlag !== undefined) {
    return validationFailure(
      operation,
      'API keys are managed by Cursor authentication or CURSOR_API_KEY and cannot be passed through this library.',
    );
  }

  return { ok: true, data: input };
}

export function validateClientOptions(
  options: CursorCliClientOptions,
): CursorResult<CursorCliClientOptions> {
  if (options.executable !== undefined) {
    const executable = validateText(
      options.executable,
      'executable',
      'client',
      true,
    );
    if (!executable.ok) {
      return executable;
    }
  }
  if (options.cwd !== undefined) {
    const cwd = validateText(options.cwd, 'cwd', 'client', true);
    if (!cwd.ok) {
      return cwd;
    }
  }
  if (
    options.timeoutMs !== undefined &&
    (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1)
  ) {
    return validationFailure('client', 'timeoutMs must be a positive integer.');
  }
  return { ok: true, data: options };
}
