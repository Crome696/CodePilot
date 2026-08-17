import { CursorCliClient, buildCursorCliArgs } from './client';
import type {
  CommandExecutionOptions,
  CommandExecutionResult,
  CursorCommandRunnerLike,
} from './types';

class FakeRunner implements CursorCommandRunnerLike {
  readonly calls: readonly {
    readonly args: readonly string[];
    readonly options: CommandExecutionOptions | undefined;
  }[] = [];
  private readonly responses: CommandExecutionResult[];

  constructor(...responses: CommandExecutionResult[]) {
    this.responses = [...responses];
  }

  async execute(
    args: readonly string[],
    options?: CommandExecutionOptions,
  ): Promise<CommandExecutionResult> {
    (
      this.calls as {
        args: readonly string[];
        options: CommandExecutionOptions | undefined;
      }[]
    ).push({ args, options });
    const response = this.responses.shift();
    if (response === undefined) {
      throw new Error('FakeRunner has no response left.');
    }
    return response;
  }
}

function commandResult(
  stdout: string,
  stderr = '',
  exitCode = 0,
): CommandExecutionResult {
  return { exitCode, stdout, stderr, durationMs: 10 };
}

describe('buildCursorCliArgs', () => {
  it('keeps model, reasoning variant and capability selection explicit', () => {
    const result = buildCursorCliArgs({
      prompt: 'Implement the approved change.',
      model: {
        id: 'GPT-5.6 Sol',
        reasoningLevel: 'extra-high',
        fast: true,
      },
      mode: 'plan',
      capabilities: {
        skills: ['development:typescript-docs-reference'],
        plugins: ['github'],
        mcpServers: ['github'],
        subagents: ['reviewer'],
        rules: ['AGENTS.md'],
        files: ['README.md'],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data).toContain('--mode=plan');
    expect(result.data).toEqual(
      expect.arrayContaining(['--model', 'GPT-5.6 Sol Extra High Fast']),
    );
    const prompt = result.data.at(-1) ?? '';
    expect(prompt).toContain('[CodePilot capability selection]');
    expect(prompt).toContain('`development:typescript-docs-reference`');
    expect(prompt).toContain('`github`');
    expect(prompt).toContain('Implement the approved change.');
  });

  it('preserves a raw version-specific model identifier', () => {
    const result = buildCursorCliArgs({
      prompt: 'Explain the current implementation.',
      model: 'gpt-5.6-sol-extra-high-fast',
      mode: 'ask',
      outputFormat: 'stream-json',
      streamPartialOutput: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data).toEqual(
      expect.arrayContaining(['--model', 'gpt-5.6-sol-extra-high-fast']),
    );
    expect(result.data).toContain('--mode=ask');
    expect(result.data).toContain('--stream-partial-output');
  });

  it('rejects credential flags and conflicting approval modes', () => {
    const credential = buildCursorCliArgs({
      prompt: 'Run a task.',
      extraArgs: ['--api-key', 'secret'],
    });
    const approval = buildCursorCliArgs({
      prompt: 'Plan a task.',
      plan: true,
      force: true,
    });

    expect(credential).toMatchObject({
      ok: false,
      error: { category: 'validation' },
    });
    expect(approval).toMatchObject({
      ok: false,
      error: { category: 'validation' },
    });
  });
});

describe('CursorCliClient', () => {
  it('runs plan mode and parses the structured result', async () => {
    const runner = new FakeRunner(
      commandResult(
        JSON.stringify({
          type: 'result',
          subtype: 'success',
          result: 'Plan created.',
          session_id: 'session-1',
          request_id: 'request-1',
          duration_ms: 123,
          duration_api_ms: 100,
        }),
      ),
    );
    const client = new CursorCliClient({ runner });

    const result = await client.plan({
      prompt: 'Create a German implementation plan.',
      model: 'Auto',
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        text: 'Plan created.',
        sessionId: 'session-1',
        requestId: 'request-1',
        outputFormat: 'json',
      },
    });
    expect(runner.calls[0]?.args).toEqual(
      expect.arrayContaining([
        '--print',
        '--output-format',
        'json',
        '--mode=plan',
      ]),
    );
  });

  it('parses canonical result text from stream-json output', async () => {
    const runner = new FakeRunner(
      commandResult(
        [
          JSON.stringify({
            type: 'system',
            subtype: 'init',
            model: 'GPT-5.6 Sol Extra High Fast',
            session_id: 'session-2',
          }),
          JSON.stringify({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'partial ' }] },
            session_id: 'session-2',
          }),
          JSON.stringify({
            type: 'result',
            subtype: 'success',
            result: 'partial final text',
            session_id: 'session-2',
            request_id: 'request-2',
            duration_ms: 200,
          }),
        ].join('\n'),
      ),
    );
    const client = new CursorCliClient({ runner });

    const result = await client.run({
      prompt: 'Answer without changing files.',
      outputFormat: 'stream-json',
      streamPartialOutput: true,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        text: 'partial final text',
        sessionId: 'session-2',
        requestId: 'request-2',
        model: 'GPT-5.6 Sol Extra High Fast',
      },
    });
    if (result.ok) {
      expect(result.data.events).toHaveLength(3);
    }
  });

  it('categorizes invalid-model CLI failures', async () => {
    const runner = new FakeRunner(
      commandResult('', 'Model name is not valid: GPT-unknown', 1),
    );
    const result = await new CursorCliClient({ runner }).run({
      prompt: 'Run with an invalid model.',
      model: 'GPT-unknown',
    });

    expect(result).toMatchObject({
      ok: false,
      error: { category: 'invalid_model', operation: 'run' },
    });
  });

  it('reports CLI availability and authentication independently', async () => {
    const runner = new FakeRunner(
      commandResult('agent version 2026.08.17\n'),
      commandResult('', 'Not logged in', 1),
    );
    const result = await new CursorCliClient({ runner }).health();

    expect(result).toMatchObject({
      ok: true,
      data: {
        cli: { available: true, version: '2026.08.17' },
        authentication: {
          status: 'unauthenticated',
          diagnostic: 'Not logged in',
        },
        canRun: false,
      },
    });
  });

  it('lists models and MCP servers through their CLI commands', async () => {
    const runner = new FakeRunner(
      commandResult('GPT-5.6 Sol Extra High Fast\nClaude Sonnet 5\n'),
      commandResult('github connected\nfilesystem disabled\n'),
    );
    const client = new CursorCliClient({ runner });

    const models = await client.listModels();
    const mcpServers = await client.listMcpServers();

    expect(models).toMatchObject({
      ok: true,
      data: [{ id: 'GPT-5.6 Sol Extra High Fast' }, { id: 'Claude Sonnet 5' }],
    });
    expect(mcpServers).toMatchObject({
      ok: true,
      data: [
        { name: 'github', status: 'connected' },
        { name: 'filesystem', status: 'disabled' },
      ],
    });
    expect(runner.calls[0]?.args).toEqual(['models']);
    expect(runner.calls[1]?.args).toEqual(['mcp', 'list']);
  });
});
