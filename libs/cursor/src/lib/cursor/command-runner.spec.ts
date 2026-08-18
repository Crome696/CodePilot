import {
  CursorCommandRunner,
  getDefaultCursorExecutable,
} from './command-runner';

describe('CursorCommandRunner', () => {
  it('selects the Windows .cmd launcher while preserving the Unix launcher', () => {
    expect(getDefaultCursorExecutable('win32')).toBe('agent.cmd');
    expect(getDefaultCursorExecutable('linux')).toBe('agent');
  });

  it('passes values as arguments without shell interpretation', async () => {
    const runner = new CursorCommandRunner({ executable: process.execPath });
    const value = '$(not-a-command); & do-not-run';

    const result = await runner.execute([
      '-e',
      'process.stdout.write(process.argv[1])',
      value,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(value);
  });

  it('reports an unavailable executable through the runner error boundary', async () => {
    const runner = new CursorCommandRunner({
      executable: 'codepilot-agent-does-not-exist',
    });

    await expect(runner.execute(['--version'])).rejects.toMatchObject({
      name: 'CursorCommandRunnerError',
      code: 'executable_unavailable',
    });
  });
});
