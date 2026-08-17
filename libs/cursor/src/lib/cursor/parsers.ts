import { jsonFailure, parseFailure, success } from './errors';
import type {
  CursorAssistantEvent,
  CursorCapabilitySelection,
  CursorMcpServer,
  CursorModel,
  CursorModelSelection,
  CursorModelSummary,
  CursorOutputFormat,
  CursorResult,
  CursorResultEvent,
  CursorRunResult,
  CursorStreamEvent,
  CursorSystemEvent,
  CursorToolCallEvent,
  CursorUnknownEvent,
} from './types';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asArray(value: unknown): readonly unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function firstString(record: JsonRecord, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function firstNumber(record: JsonRecord, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = numberValue(record[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function sessionId(record: JsonRecord): string | null {
  return firstString(record, 'session_id', 'sessionId');
}

function textFromContent(value: unknown): string {
  const directText = stringValue(value);
  if (directText !== null) {
    return directText;
  }

  return (asArray(value) ?? [])
    .flatMap((entry) => {
      const record = asRecord(entry);
      const text = record ? stringValue(record.text) : null;
      return text === null ? [] : [text];
    })
    .join('');
}

function messageText(record: JsonRecord): string {
  const message = asRecord(record.message);
  if (!message) {
    return textFromContent(record.text);
  }
  return textFromContent(message.content);
}

function mapSystemEvent(record: JsonRecord): CursorSystemEvent {
  return {
    type: 'system',
    subtype: firstString(record, 'subtype') ?? undefined,
    sessionId: sessionId(record),
    model: firstString(record, 'model'),
    raw: record,
  };
}

function mapAssistantEvent(record: JsonRecord): CursorAssistantEvent {
  return {
    type: 'assistant',
    subtype: firstString(record, 'subtype') ?? undefined,
    text: messageText(record),
    sessionId: sessionId(record),
    raw: record,
  };
}

function mapToolCallEvent(record: JsonRecord): CursorToolCallEvent {
  const toolCall = asRecord(record.tool_call);
  const toolName =
    firstString(record, 'tool_name', 'toolName', 'name') ??
    (toolCall ? (Object.keys(toolCall)[0] ?? null) : null);

  return {
    type: 'tool_call',
    subtype: firstString(record, 'subtype') ?? undefined,
    toolName,
    status: firstString(record, 'status'),
    sessionId: sessionId(record),
    raw: record,
  };
}

function mapResultEvent(record: JsonRecord): CursorResultEvent | null {
  const text = stringValue(record.result);
  return text === null
    ? null
    : {
        type: 'result',
        subtype: firstString(record, 'subtype') ?? undefined,
        text,
        sessionId: sessionId(record),
        requestId: firstString(record, 'request_id', 'requestId'),
        model: firstString(record, 'model'),
        durationMs: firstNumber(record, 'duration_ms', 'durationMs'),
        durationApiMs: firstNumber(record, 'duration_api_ms', 'durationApiMs'),
        raw: record,
      };
}

function mapStreamEvent(
  value: unknown,
  operation: string,
): CursorResult<CursorStreamEvent> {
  const record = asRecord(value);
  const type = record ? stringValue(record.type) : null;
  if (record === null || type === null) {
    return parseFailure(
      operation,
      'The Cursor CLI emitted a stream event without an object type.',
    );
  }

  switch (type) {
    case 'system':
      return success(mapSystemEvent(record));
    case 'assistant':
      return success(mapAssistantEvent(record));
    case 'tool_call':
      return success(mapToolCallEvent(record));
    case 'result': {
      const resultEvent = mapResultEvent(record);
      return resultEvent === null
        ? parseFailure(
            operation,
            'The Cursor CLI emitted a result event without result text.',
          )
        : success(resultEvent);
    }
    default: {
      const unknownEvent: CursorUnknownEvent = { type, raw: record };
      return success(unknownEvent);
    }
  }
}

function emptyRunResult(
  outputFormat: CursorOutputFormat,
  text: string,
  raw: unknown,
): CursorRunResult {
  return {
    text,
    sessionId: null,
    requestId: null,
    model: null,
    durationMs: null,
    durationApiMs: null,
    outputFormat,
    events: [],
    raw,
  };
}

function modelSelectionValue(selection: CursorModelSelection): string {
  if (selection.variant !== undefined) {
    return selection.variant;
  }

  const parts = [selection.id];
  if (
    selection.reasoningLevel !== undefined &&
    selection.reasoningLevel !== 'none'
  ) {
    parts.push(
      selection.reasoningLevel
        .replaceAll('-', ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase()),
    );
  }
  if (selection.fast === true) {
    parts.push('Fast');
  }
  return parts.join(' ');
}

export function formatCursorModel(model: CursorModel): string {
  return typeof model === 'string' ? model : modelSelectionValue(model);
}

function capabilityLines(
  label: string,
  values: readonly string[] | undefined,
): readonly string[] {
  return values === undefined || values.length === 0
    ? []
    : [`- ${label}: ${values.map((value) => `\`${value}\``).join(', ')}`];
}

/**
 * Cursor discovers skills, plugins, rules and MCP configuration from the
 * workspace. This adds an explicit, auditable selection hint to the prompt;
 * it does not install capabilities or bypass Cursor permissions.
 */
export function buildCapabilityPrompt(
  prompt: string,
  capabilities: CursorCapabilitySelection | undefined,
): string {
  if (capabilities === undefined) {
    return prompt;
  }

  const lines = [
    ...capabilityLines('Skills', capabilities.skills),
    ...capabilityLines('Plugins', capabilities.plugins),
    ...capabilityLines('MCP servers', capabilities.mcpServers),
    ...capabilityLines('Subagents', capabilities.subagents),
    ...capabilityLines('Rules', capabilities.rules),
    ...capabilityLines('Files', capabilities.files),
  ];

  return lines.length === 0
    ? prompt
    : `${prompt.trimEnd()}\n\n[CodePilot capability selection]\n${lines.join('\n')}`;
}

export function parseCursorOutput(
  stdout: string,
  outputFormat: CursorOutputFormat,
  operation: string,
): CursorResult<CursorRunResult> {
  if (outputFormat === 'text') {
    return success(emptyRunResult(outputFormat, stdout.trim(), stdout));
  }

  if (outputFormat === 'json') {
    let value: unknown;
    try {
      value = JSON.parse(stdout) as unknown;
    } catch (error) {
      return jsonFailure(operation, error);
    }

    const record = asRecord(value);
    const resultEvent = record ? mapResultEvent(record) : null;
    if (record === null || record.type !== 'result' || resultEvent === null) {
      return parseFailure(
        operation,
        'The Cursor CLI JSON response did not contain a result event.',
      );
    }

    return success({
      text: resultEvent.text,
      sessionId: resultEvent.sessionId,
      requestId: resultEvent.requestId,
      model: resultEvent.model,
      durationMs: resultEvent.durationMs,
      durationApiMs: resultEvent.durationApiMs,
      outputFormat,
      events: [resultEvent],
      raw: value,
    });
  }

  const events: CursorStreamEvent[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (line.trim().length === 0) {
      continue;
    }

    let value: unknown;
    try {
      value = JSON.parse(line) as unknown;
    } catch (error) {
      return jsonFailure(operation, error);
    }

    const event = mapStreamEvent(value, operation);
    if (!event.ok) {
      return event;
    }
    events.push(event.data);
  }

  const resultEvent = [...events]
    .reverse()
    .find((event): event is CursorResultEvent => event.type === 'result');
  const systemEvent = events.find(
    (event): event is CursorSystemEvent => event.type === 'system',
  );
  const assistantText = events
    .filter(
      (event): event is CursorAssistantEvent => event.type === 'assistant',
    )
    .map((event) => event.text)
    .join('');

  if (resultEvent === undefined && events.length === 0) {
    return parseFailure(
      operation,
      'The Cursor CLI returned an empty stream-json response.',
    );
  }

  return success({
    text: resultEvent?.text ?? assistantText,
    sessionId: resultEvent?.sessionId ?? systemEvent?.sessionId ?? null,
    requestId: resultEvent?.requestId ?? null,
    model: resultEvent?.model ?? systemEvent?.model ?? null,
    durationMs: resultEvent?.durationMs ?? null,
    durationApiMs: resultEvent?.durationApiMs ?? null,
    outputFormat,
    events,
    raw: events.map((event) => event.raw),
  });
}

export function parseCursorVersion(stdout: string): CursorResult<string> {
  const match =
    /(?:cursor-agent|agent)(?:\s+cli)?\s+(?:version\s+|v)?([0-9][^\s]*)/i.exec(
      stdout,
    );
  if (match?.[1] !== undefined) {
    return success(match[1]);
  }

  const fallback = /\b\d+(?:\.\d+)+(?:[-+][A-Za-z0-9.-]+)?\b/.exec(stdout);
  return fallback === null
    ? parseFailure(
        'health.cli_version',
        'The Cursor CLI version output was not recognized.',
      )
    : success(fallback[0]);
}

function parseJsonValue(stdout: string): unknown | null {
  try {
    return JSON.parse(stdout) as unknown;
  } catch {
    return null;
  }
}

export function parseCursorModels(
  stdout: string,
  operation = 'models.list',
): CursorResult<readonly CursorModelSummary[]> {
  const parsed = parseJsonValue(stdout);
  const parsedRecord = asRecord(parsed);
  const values =
    asArray(parsed) ??
    (parsedRecord ? asArray(parsedRecord.models ?? parsedRecord.data) : null);
  if (values !== null) {
    return success(
      values.flatMap((value) => {
        const record = asRecord(value);
        const id = record ? firstString(record, 'id', 'model', 'name') : null;
        return id === null
          ? []
          : [
              {
                id,
                name: record
                  ? firstString(record, 'name', 'displayName')
                  : null,
                raw: value,
              },
            ];
      }),
    );
  }

  const models = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^available models:?$/i.test(line) &&
        !/^-{3,}$/.test(line),
    );
  return models.length === 0
    ? parseFailure(operation, 'The Cursor CLI returned no model entries.')
    : success(models.map((id) => ({ id, name: null, raw: id })));
}

export function parseCursorMcpServers(
  stdout: string,
  operation = 'mcp.list',
): CursorResult<readonly CursorMcpServer[]> {
  const parsed = parseJsonValue(stdout);
  const parsedRecord = asRecord(parsed);
  const values =
    asArray(parsed) ??
    (parsedRecord
      ? asArray(parsedRecord.servers ?? parsedRecord.mcpServers)
      : null);
  if (values !== null) {
    return success(
      values.flatMap((value) => {
        const record = asRecord(value);
        const name = record ? firstString(record, 'name', 'id') : null;
        return name === null
          ? []
          : [
              {
                name,
                status: record ? firstString(record, 'status', 'state') : null,
                raw: value,
              },
            ];
      }),
    );
  }

  const servers = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !/^configured mcp servers:?$/i.test(line) &&
        !/^-{3,}$/.test(line),
    )
    .map((line) => {
      const [name, ...status] = line.split(/\s+/);
      return { name, status: status.join(' ') || null, raw: line };
    });

  return servers.length === 0
    ? parseFailure(operation, 'The Cursor CLI returned no MCP server entries.')
    : success(servers);
}
