import { GitHubCliClient } from './client';
import type {
  CommandExecutionOptions,
  CommandExecutionResult,
  GitHubCommandRunner,
} from './types';

class FakeRunner implements GitHubCommandRunner {
  readonly calls: Array<{
    args: readonly string[];
    options: CommandExecutionOptions | undefined;
  }> = [];

  private readonly responses: Array<CommandExecutionResult | Error> = [];

  respondJson(value: unknown): void {
    this.responses.push({
      exitCode: 0,
      stdout: JSON.stringify(value),
      stderr: '',
      durationMs: 1,
    });
  }

  respondText(stdout: string, exitCode = 0, stderr = ''): void {
    this.responses.push({ exitCode, stdout, stderr, durationMs: 1 });
  }

  respondError(error: Error): void {
    this.responses.push(error);
  }

  execute(
    args: readonly string[],
    options?: CommandExecutionOptions,
  ): Promise<CommandExecutionResult> {
    this.calls.push({ args: [...args], options });
    const response = this.responses.shift();
    if (response === undefined) {
      return Promise.reject(new Error('No fake response configured.'));
    }
    return response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response);
  }
}

const issue = {
  id: 1,
  number: 16,
  title: 'Typed integration',
  body: 'Body',
  state: 'open',
  author: { login: 'octocat', url: 'https://github.com/octocat' },
  assignees: [],
  labels: [{ name: 'enhancement', color: 'a2eeef' }],
  milestone: null,
  comments: 2,
  createdAt: '2026-08-17T00:00:00Z',
  updatedAt: '2026-08-17T00:00:00Z',
  closedAt: null,
  stateReason: null,
  isPinned: false,
  url: 'https://github.com/Crome696/CodePilot/issues/16',
};

describe('GitHubCliClient', () => {
  it('uses dedicated structured issue listing with an explicit repository', async () => {
    const runner = new FakeRunner();
    runner.respondJson([issue]);
    const client = new GitHubCliClient({ runner });

    const result = await client.listIssues({
      repository: 'Crome696/CodePilot',
      state: 'all',
      labels: ['enhancement'],
      limit: 25,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0]?.number).toBe(16);
      expect(result.data[0]?.labels[0]?.name).toBe('enhancement');
    }
    expect(runner.calls[0]?.args).toContain('--json');
    expect(runner.calls[0]?.args).toContain('Crome696/CodePilot');
    expect(runner.calls[0]?.args).toContain('--label');
  });

  it('rejects an invalid repository before invoking gh', async () => {
    const runner = new FakeRunner();
    const client = new GitHubCliClient({ runner });

    const result = await client.getIssue({
      repository: 'Crome696/CodePilot; rm -rf /',
      number: 16,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('validation');
    }
    expect(runner.calls).toHaveLength(0);
  });

  it('sends issue mutations as structured JSON and keeps delete explicit', async () => {
    const runner = new FakeRunner();
    runner.respondJson(issue);
    runner.respondJson({ ...issue, title: 'Updated' });
    runner.respondText('');
    const client = new GitHubCliClient({ runner });

    const created = await client.createIssue({
      repository: 'Crome696/CodePilot',
      title: 'Created',
      body: 'Safe body',
      labels: ['enhancement'],
      assignees: ['octocat'],
    });
    const updated = await client.updateIssue({
      repository: 'Crome696/CodePilot',
      number: 16,
      title: 'Updated',
      labels: [],
      assignees: [],
    });
    const deleted = await client.deleteIssue({
      repository: 'Crome696/CodePilot',
      number: 16,
    });

    expect(created.ok).toBe(true);
    expect(updated.ok).toBe(true);
    expect(deleted.ok).toBe(true);
    const createCall = runner.calls[0];
    expect(createCall?.args).toEqual([
      'api',
      'repos/Crome696/CodePilot/issues',
      '--method',
      'POST',
      '--input',
      '-',
    ]);
    expect(JSON.parse(createCall?.options?.input ?? '{}')).toMatchObject({
      title: 'Created',
      labels: ['enhancement'],
      assignees: ['octocat'],
    });
    const deleteCall = runner.calls[2];
    expect(deleteCall?.args).toContain('DELETE');
    expect(deleteCall?.args).not.toContain('close');
  });

  it('flattens paginated commit API responses and preserves the requested ref', async () => {
    const runner = new FakeRunner();
    runner.respondJson([
      [
        {
          sha: 'a'.repeat(40),
          html_url: 'https://github.com/Crome696/CodePilot/commit/a',
          commit: {
            message: 'First commit\n\nDetails',
            author: {
              name: 'A',
              email: 'a@example.com',
              date: '2026-08-17T00:00:00Z',
            },
            committer: {
              name: 'A',
              email: 'a@example.com',
              date: '2026-08-17T00:00:00Z',
            },
          },
          parents: [],
        },
      ],
      [
        {
          sha: 'b'.repeat(40),
          html_url: 'https://github.com/Crome696/CodePilot/commit/b',
          commit: { message: 'Second commit' },
          parents: [],
        },
      ],
    ]);
    const client = new GitHubCliClient({ runner });

    const result = await client.listCommits({
      repository: 'Crome696/CodePilot',
      ref: 'main',
      perPage: 2,
      paginate: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toHaveLength(2);
      expect(result.data.items[0]?.title).toBe('First commit');
      expect(result.data.pagination.hasNextPage).toBe(false);
    }
    expect(runner.calls[0]?.args).toEqual([
      'api',
      'repos/Crome696/CodePilot/commits',
      '--method',
      'GET',
      '--raw-field',
      'sha=main',
      '--field',
      'per_page=2',
      '--paginate',
      '--slurp',
    ]);
  });

  it('returns typed pull-request review and merge results', async () => {
    const runner = new FakeRunner();
    runner.respondJson({
      id: 123,
      user: { login: 'octocat' },
      body: 'Looks good',
      state: 'APPROVED',
      submitted_at: '2026-08-17T00:00:00Z',
      html_url: 'https://github.com/Crome696/CodePilot/pull/1#review-123',
    });
    runner.respondJson({
      merged: true,
      sha: 'c'.repeat(40),
      message: 'Pull Request successfully merged',
    });
    const client = new GitHubCliClient({ runner });

    const review = await client.submitPullRequestReview({
      repository: 'Crome696/CodePilot',
      number: 1,
      event: 'APPROVE',
      body: 'Looks good',
    });
    const merge = await client.mergePullRequest({
      repository: 'Crome696/CodePilot',
      number: 1,
      method: 'squash',
    });

    expect(review.ok).toBe(true);
    if (review.ok) {
      expect(review.data.event).toBe('APPROVE');
      expect(review.data.id).toBe('123');
    }
    expect(merge.ok).toBe(true);
    if (merge.ok) {
      expect(merge.data.method).toBe('squash');
      expect(merge.data.merged).toBe(true);
    }
    expect(runner.calls[0]?.options?.input).toContain('APPROVE');
    expect(runner.calls[1]?.options?.input).toContain('squash');
  });

  it('evaluates milestone progress with deterministic empty and due-date states', async () => {
    const runner = new FakeRunner();
    runner.respondJson({
      id: 7,
      number: 2,
      title: 'Release',
      description: 'Release work',
      state: 'open',
      open_issues: 1,
      closed_issues: 3,
      due_on: '2026-08-20T00:00:00Z',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-17T00:00:00Z',
      closed_at: null,
      creator: { login: 'octocat' },
      html_url: 'https://github.com/Crome696/CodePilot/milestone/2',
    });
    const client = new GitHubCliClient({
      runner,
      now: () => new Date('2026-08-17T00:00:00Z'),
    });

    const result = await client.evaluateMilestone({
      repository: 'Crome696/CodePilot',
      number: 2,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totalItems).toBe(4);
      expect(result.data.completionPercentage).toBe(75);
      expect(result.data.itemStatus).toBe('has_items');
      expect(result.data.dueDateStatus).toBe('upcoming');
    }
  });

  it('normalizes non-zero CLI exits into typed permission errors', async () => {
    const runner = new FakeRunner();
    runner.respondText(
      '',
      1,
      'HTTP 403: Resource not accessible by integration',
    );
    const client = new GitHubCliClient({ runner });

    const result = await client.getIssue({
      repository: 'Crome696/CodePilot',
      number: 16,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('permission');
      expect(result.error.exitCode).toBe(1);
    }
  });

  it('reports CLI version and unauthenticated health without exposing credentials', async () => {
    const runner = new FakeRunner();
    runner.respondText('gh version 2.80.0 (2026-08-17)');
    runner.respondText('', 1, 'not logged in to github.com');
    const client = new GitHubCliClient({ runner });

    const result = await client.health();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.cli.version).toBe('2.80.0');
      expect(result.data.authentication.status).toBe('unauthenticated');
      expect(result.data.canRead).toBe(false);
      expect(result.data.canWrite).toBe(false);
    }
    expect(runner.calls.map((call) => call.args)).toEqual([
      ['--version'],
      ['auth', 'status', '--hostname', 'github.com'],
    ]);
  });
});
