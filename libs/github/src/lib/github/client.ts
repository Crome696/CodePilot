import { GhCommandRunner } from './command-runner';
import {
  cliExitFailure,
  commandRunnerFailure,
  parseFailure,
  sanitizeDiagnostic,
  success,
} from './errors';
import {
  parseCommit,
  parseCommits,
  parseIssue,
  parseIssues,
  parseJson,
  parseMilestone,
  parseMilestones,
  parsePullRequest,
  parsePullRequests,
  parseReview,
} from './parsers';
import {
  validateCollection,
  validateEnum,
  validateLimit,
  validateOptionalText,
  validatePagination,
  validatePositiveInteger,
  validateRepository,
  validateRequiredText,
} from './validation';
import type {
  CommandExecutionResult,
  CommitListResult,
  CreateIssueInput,
  CreateMilestoneInput,
  DeleteIssueInput,
  DeletedIssue,
  GetCommitInput,
  GetIssueInput,
  GetMilestoneInput,
  GetPullRequestInput,
  GitHubCliClientOptions,
  GitHubCommandRunner,
  GitHubCommit,
  GitHubError,
  GitHubHealth,
  GitHubIssue,
  GitHubIssueListState,
  GitHubMilestone,
  GitHubMilestoneListState,
  GitHubMilestoneState,
  GitHubPullRequest,
  GitHubPullRequestListState,
  GitHubPullRequestMergeMethod,
  GitHubPullRequestReviewEvent,
  GitHubResult,
  ListCommitsInput,
  ListIssuesInput,
  ListMilestonesInput,
  ListPullRequestsInput,
  MergePullRequestInput,
  MergePullRequestResult,
  MilestoneEvaluation,
  PaginationInfo,
  SubmitPullRequestReviewInput,
  SubmitPullRequestReviewResult,
  UpdateIssueInput,
} from './types';

const DEFAULT_HOSTNAME = 'github.com';
const DEFAULT_TIMEOUT_MS = 30_000;

const ISSUE_JSON_FIELDS = [
  'id',
  'number',
  'title',
  'body',
  'state',
  'author',
  'assignees',
  'labels',
  'milestone',
  'comments',
  'createdAt',
  'updatedAt',
  'closedAt',
  'stateReason',
  'isPinned',
  'url',
].join(',');

const PULL_REQUEST_JSON_FIELDS = [
  'id',
  'number',
  'title',
  'body',
  'state',
  'author',
  'assignees',
  'labels',
  'milestone',
  'baseRefName',
  'baseRefOid',
  'headRefName',
  'headRefOid',
  'createdAt',
  'updatedAt',
  'closedAt',
  'mergedAt',
  'isDraft',
  'additions',
  'deletions',
  'changedFiles',
  'mergeStateStatus',
  'mergeable',
  'reviewDecision',
  'files',
  'commits',
  'statusCheckRollup',
  'reviews',
  'comments',
  'url',
].join(',');

function apiPath(repository: string, path: string): string {
  return `repos/${repository}/${path}`;
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function idValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function paginationInfo(
  page: number | undefined,
  perPage: number,
  paginate: boolean,
  itemCount: number,
): PaginationInfo {
  return {
    page: page ?? null,
    perPage,
    hasNextPage: paginate
      ? false
      : page === undefined
        ? null
        : itemCount >= perPage,
  };
}

export class GitHubCliClient {
  private readonly runner: GitHubCommandRunner;
  private readonly hostname: string;
  private readonly timeoutMs: number;
  private readonly now: () => Date;

  constructor(options: GitHubCliClientOptions = {}) {
    this.runner = options.runner ?? new GhCommandRunner();
    this.hostname = (options.hostname ?? DEFAULT_HOSTNAME).replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = options.now ?? (() => new Date());
  }

  async health(): Promise<GitHubResult<GitHubHealth>> {
    const versionResult = await this.runSuccessful('health.cli_version', [
      '--version',
    ]);
    if (!versionResult.ok) {
      return versionResult;
    }

    const versionMatch = /gh version\s+([^\s]+)/i.exec(
      versionResult.data.stdout,
    );
    if (!versionMatch) {
      return parseFailure(
        'health.cli_version',
        'The GitHub CLI version output was not recognized.',
      );
    }

    const authResult = await this.runRaw('health.auth_status', [
      'auth',
      'status',
      '--hostname',
      this.hostname,
    ]);
    if (!authResult.ok) {
      return authResult;
    }

    const authOutput = `${authResult.data.stdout}\n${authResult.data.stderr}`;
    const account =
      /account\s+([A-Za-z0-9][A-Za-z0-9-]*)/i.exec(authOutput)?.[1] ?? null;
    const diagnostic = sanitizeDiagnostic(
      authResult.data.stderr || authResult.data.stdout,
    );
    const authenticated = authResult.data.exitCode === 0;
    const status = authenticated
      ? 'authenticated'
      : /not logged in|invalid token|authentication|authenticat/i.test(
            authOutput,
          )
        ? 'unauthenticated'
        : 'unknown';

    return success({
      cli: {
        available: true,
        version: versionMatch[1],
      },
      authentication: {
        host: this.hostname,
        status,
        account,
        diagnostic: authenticated ? null : diagnostic || null,
      },
      canRead: authenticated,
      canWrite: authenticated,
    });
  }

  async listCommits(
    input: ListCommitsInput,
  ): Promise<GitHubResult<CommitListResult>> {
    const operation = 'commits.list';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const pagination = validatePagination(input, operation);
    if (!pagination.ok) {
      return pagination;
    }
    const ref = validateOptionalText(input.ref, 'ref', operation);
    if (!ref.ok) {
      return ref;
    }

    const args = [
      'api',
      apiPath(repository.data, 'commits'),
      '--method',
      'GET',
    ];
    if (ref.data !== undefined) {
      args.push('--raw-field', `sha=${ref.data}`);
    }
    args.push('--field', `per_page=${pagination.data.perPage}`);
    if (pagination.data.page !== undefined) {
      args.push('--field', `page=${pagination.data.page}`);
    } else if (pagination.data.paginate) {
      args.push('--paginate', '--slurp');
    }

    const result = await this.runJson(operation, args);
    if (!result.ok) {
      return result;
    }
    const commits = parseCommits(result.data, operation);
    if (!commits.ok) {
      return commits;
    }

    return success({
      items: commits.data,
      pagination: paginationInfo(
        pagination.data.page,
        pagination.data.perPage,
        pagination.data.paginate ?? false,
        commits.data.length,
      ),
    });
  }

  async getCommit(input: GetCommitInput): Promise<GitHubResult<GitHubCommit>> {
    const operation = 'commits.get';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const sha = this.validateReference(input.sha, 'sha', operation);
    if (!sha.ok) {
      return sha;
    }

    const result = await this.runJson(operation, [
      'api',
      apiPath(repository.data, `commits/${sha.data}`),
      '--method',
      'GET',
    ]);
    if (!result.ok) {
      return result;
    }
    return parseCommit(result.data, operation);
  }

  async listIssues(
    input: ListIssuesInput,
  ): Promise<GitHubResult<readonly GitHubIssue[]>> {
    const operation = 'issues.list';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const state = validateEnum<GitHubIssueListState>(
      input.state,
      'state',
      ['open', 'closed', 'all'],
      operation,
    );
    if (!state.ok) {
      return state;
    }
    const labels = validateCollection(input.labels, 'labels', operation);
    if (!labels.ok) {
      return labels;
    }
    const assignee = validateOptionalText(
      input.assignee,
      'assignee',
      operation,
    );
    if (!assignee.ok) {
      return assignee;
    }
    const milestone = validateOptionalText(
      input.milestone,
      'milestone',
      operation,
    );
    if (!milestone.ok) {
      return milestone;
    }
    const search = validateOptionalText(input.search, 'search', operation);
    if (!search.ok) {
      return search;
    }
    const limit = validateLimit(input.limit, operation);
    if (!limit.ok) {
      return limit;
    }

    const args = [
      'issue',
      'list',
      '--repo',
      repository.data,
      '--state',
      state.data ?? 'open',
      '--limit',
      String(limit.data),
      '--json',
      ISSUE_JSON_FIELDS,
    ];
    for (const label of labels.data ?? []) {
      args.push('--label', label);
    }
    if (assignee.data !== undefined) {
      args.push('--assignee', assignee.data);
    }
    if (milestone.data !== undefined) {
      args.push('--milestone', milestone.data);
    }
    if (search.data !== undefined) {
      args.push('--search', search.data);
    }

    const result = await this.runJson(operation, args);
    if (!result.ok) {
      return result;
    }
    return parseIssues(result.data, operation);
  }

  async getIssue(input: GetIssueInput): Promise<GitHubResult<GitHubIssue>> {
    const operation = 'issues.get';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const number = validatePositiveInteger(input.number, 'number', operation);
    if (!number.ok) {
      return number;
    }

    const result = await this.runJson(operation, [
      'issue',
      'view',
      String(number.data),
      '--repo',
      repository.data,
      '--json',
      ISSUE_JSON_FIELDS,
    ]);
    if (!result.ok) {
      return result;
    }
    return parseIssue(result.data, operation);
  }

  async createIssue(
    input: CreateIssueInput,
  ): Promise<GitHubResult<GitHubIssue>> {
    const operation = 'issues.create';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const title = validateRequiredText(input.title, 'title', operation);
    if (!title.ok) {
      return title;
    }
    const body = validateOptionalText(
      input.body ?? undefined,
      'body',
      operation,
    );
    if (!body.ok) {
      return body;
    }
    const labels = validateCollection(input.labels, 'labels', operation);
    if (!labels.ok) {
      return labels;
    }
    const assignees = validateCollection(
      input.assignees,
      'assignees',
      operation,
    );
    if (!assignees.ok) {
      return assignees;
    }
    if (input.milestone !== undefined && input.milestone !== null) {
      const milestone = validatePositiveInteger(
        input.milestone,
        'milestone',
        operation,
      );
      if (!milestone.ok) {
        return milestone;
      }
    }

    return this.runIssueMutation(operation, repository.data, 'POST', 'issues', {
      title: title.data,
      body: body.data ?? null,
      labels: [...(labels.data ?? [])],
      assignees: [...(assignees.data ?? [])],
      milestone: input.milestone ?? null,
    });
  }

  async updateIssue(
    input: UpdateIssueInput,
  ): Promise<GitHubResult<GitHubIssue>> {
    const operation = 'issues.update';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const number = validatePositiveInteger(input.number, 'number', operation);
    if (!number.ok) {
      return number;
    }
    const title = validateOptionalText(input.title, 'title', operation);
    if (!title.ok) {
      return title;
    }
    const body =
      input.body === undefined
        ? { ok: true as const, data: undefined }
        : validateOptionalText(input.body ?? undefined, 'body', operation);
    if (!body.ok) {
      return body;
    }
    const state = validateEnum(
      input.state,
      'state',
      ['open', 'closed'] as const,
      operation,
    );
    if (!state.ok) {
      return state;
    }
    const labels = validateCollection(input.labels, 'labels', operation);
    if (!labels.ok) {
      return labels;
    }
    const assignees = validateCollection(
      input.assignees,
      'assignees',
      operation,
    );
    if (!assignees.ok) {
      return assignees;
    }
    if (input.milestone !== undefined && input.milestone !== null) {
      const milestone = validatePositiveInteger(
        input.milestone,
        'milestone',
        operation,
      );
      if (!milestone.ok) {
        return milestone;
      }
    }

    const payload: Record<string, unknown> = {};
    if (hasOwn(input, 'title')) {
      payload.title = title.data;
    }
    if (hasOwn(input, 'body')) {
      payload.body = body.data ?? null;
    }
    if (hasOwn(input, 'state')) {
      payload.state = state.data;
    }
    if (hasOwn(input, 'labels')) {
      payload.labels = [...(labels.data ?? [])];
    }
    if (hasOwn(input, 'assignees')) {
      payload.assignees = [...(assignees.data ?? [])];
    }
    if (hasOwn(input, 'milestone')) {
      payload.milestone = input.milestone ?? null;
    }

    if (Object.keys(payload).length === 0) {
      return this.getIssue({
        repository: repository.data,
        number: number.data,
      });
    }

    return this.runIssueMutation(
      operation,
      repository.data,
      'PATCH',
      `issues/${number.data}`,
      payload,
    );
  }

  async deleteIssue(
    input: DeleteIssueInput,
  ): Promise<GitHubResult<DeletedIssue>> {
    const operation = 'issues.delete';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const number = validatePositiveInteger(input.number, 'number', operation);
    if (!number.ok) {
      return number;
    }

    const result = await this.runSuccessful(operation, [
      'api',
      apiPath(repository.data, `issues/${number.data}`),
      '--method',
      'DELETE',
      '--silent',
    ]);
    if (!result.ok) {
      return result;
    }
    return success({
      repository: repository.data,
      number: number.data,
      url: this.webUrl(repository.data, `issues/${number.data}`),
      deleted: true,
    });
  }

  async listPullRequests(
    input: ListPullRequestsInput,
  ): Promise<GitHubResult<readonly GitHubPullRequest[]>> {
    const operation = 'pull_requests.list';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const state = validateEnum<GitHubPullRequestListState>(
      input.state,
      'state',
      ['open', 'closed', 'merged', 'all'],
      operation,
    );
    if (!state.ok) {
      return state;
    }
    const labels = validateCollection(input.labels, 'labels', operation);
    if (!labels.ok) {
      return labels;
    }
    const assignee = validateOptionalText(
      input.assignee,
      'assignee',
      operation,
    );
    if (!assignee.ok) {
      return assignee;
    }
    const base = validateOptionalText(input.base, 'base', operation);
    if (!base.ok) {
      return base;
    }
    const head = validateOptionalText(input.head, 'head', operation);
    if (!head.ok) {
      return head;
    }
    const search = validateOptionalText(input.search, 'search', operation);
    if (!search.ok) {
      return search;
    }
    const limit = validateLimit(input.limit, operation);
    if (!limit.ok) {
      return limit;
    }

    const args = [
      'pr',
      'list',
      '--repo',
      repository.data,
      '--state',
      state.data ?? 'open',
      '--limit',
      String(limit.data),
      '--json',
      PULL_REQUEST_JSON_FIELDS,
    ];
    for (const label of labels.data ?? []) {
      args.push('--label', label);
    }
    if (assignee.data !== undefined) {
      args.push('--assignee', assignee.data);
    }
    if (base.data !== undefined) {
      args.push('--base', base.data);
    }
    if (head.data !== undefined) {
      args.push('--head', head.data);
    }
    if (input.draft === true) {
      args.push('--draft');
    }
    if (search.data !== undefined) {
      args.push('--search', search.data);
    }

    const result = await this.runJson(operation, args);
    if (!result.ok) {
      return result;
    }
    return parsePullRequests(result.data, operation);
  }

  async getPullRequest(
    input: GetPullRequestInput,
  ): Promise<GitHubResult<GitHubPullRequest>> {
    const operation = 'pull_requests.get';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const number = validatePositiveInteger(input.number, 'number', operation);
    if (!number.ok) {
      return number;
    }

    const result = await this.runJson(operation, [
      'pr',
      'view',
      String(number.data),
      '--repo',
      repository.data,
      '--json',
      PULL_REQUEST_JSON_FIELDS,
    ]);
    if (!result.ok) {
      return result;
    }
    return parsePullRequest(result.data, operation);
  }

  async submitPullRequestReview(
    input: SubmitPullRequestReviewInput,
  ): Promise<GitHubResult<SubmitPullRequestReviewResult>> {
    const operation = 'pull_requests.review';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const number = validatePositiveInteger(input.number, 'number', operation);
    if (!number.ok) {
      return number;
    }
    const event = validateEnum<GitHubPullRequestReviewEvent>(
      input.event,
      'event',
      ['COMMENT', 'APPROVE', 'REQUEST_CHANGES'],
      operation,
    );
    if (!event.ok || event.data === undefined) {
      return event.ok
        ? parseFailure(operation, 'A review event is required.')
        : event;
    }
    const body = validateRequiredText(input.body, 'body', operation);
    if (!body.ok) {
      return body;
    }

    const result = await this.runApiJson(
      operation,
      apiPath(repository.data, `pulls/${number.data}/reviews`),
      'POST',
      { event: event.data, body: body.data },
    );
    if (!result.ok) {
      return result;
    }
    const review = parseReview(result.data, operation);
    if (!review.ok) {
      return review;
    }
    return success({
      repository: repository.data,
      number: number.data,
      id: review.data.id,
      event: event.data,
      body: body.data,
      state: review.data.state,
      url: review.data.url,
    });
  }

  async mergePullRequest(
    input: MergePullRequestInput,
  ): Promise<GitHubResult<MergePullRequestResult>> {
    const operation = 'pull_requests.merge';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const number = validatePositiveInteger(input.number, 'number', operation);
    if (!number.ok) {
      return number;
    }
    const method = validateEnum<GitHubPullRequestMergeMethod>(
      input.method,
      'method',
      ['merge', 'squash', 'rebase'],
      operation,
    );
    if (!method.ok || method.data === undefined) {
      return method.ok
        ? parseFailure(operation, 'A merge method is required.')
        : method;
    }
    const sha = validateOptionalText(input.sha, 'sha', operation);
    if (!sha.ok) {
      return sha;
    }
    const commitTitle = validateOptionalText(
      input.commitTitle,
      'commitTitle',
      operation,
    );
    if (!commitTitle.ok) {
      return commitTitle;
    }
    const commitMessage = validateOptionalText(
      input.commitMessage,
      'commitMessage',
      operation,
    );
    if (!commitMessage.ok) {
      return commitMessage;
    }

    const payload: Record<string, unknown> = { merge_method: method.data };
    if (sha.data !== undefined) {
      payload.sha = sha.data;
    }
    if (commitTitle.data !== undefined) {
      payload.commit_title = commitTitle.data;
    }
    if (commitMessage.data !== undefined) {
      payload.commit_message = commitMessage.data;
    }

    const result = await this.runApiJson(
      operation,
      apiPath(repository.data, `pulls/${number.data}/merge`),
      'PUT',
      payload,
    );
    if (!result.ok) {
      return result;
    }
    const record = recordValue(result.data);
    const merged = record ? booleanValue(record.merged) : null;
    const message = record ? stringValue(record.message) : null;
    if (record === null || merged === null || message === null) {
      return parseFailure(
        operation,
        'The GitHub CLI returned an invalid pull request merge result.',
      );
    }
    return success({
      repository: repository.data,
      number: number.data,
      url: this.webUrl(repository.data, `pull/${number.data}`),
      method: method.data,
      merged,
      sha: record ? idValue(record.sha) : null,
      message,
    });
  }

  async createMilestone(
    input: CreateMilestoneInput,
  ): Promise<GitHubResult<GitHubMilestone>> {
    const operation = 'milestones.create';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const title = validateRequiredText(input.title, 'title', operation);
    if (!title.ok) {
      return title;
    }
    const description = validateOptionalText(
      input.description ?? undefined,
      'description',
      operation,
    );
    if (!description.ok) {
      return description;
    }
    const dueOn = validateOptionalText(
      input.dueOn ?? undefined,
      'dueOn',
      operation,
    );
    if (!dueOn.ok) {
      return dueOn;
    }
    const state = validateEnum<GitHubMilestoneState>(
      input.state,
      'state',
      ['open', 'closed'],
      operation,
    );
    if (!state.ok) {
      return state;
    }

    return this.runMilestoneMutation(
      operation,
      repository.data,
      'POST',
      'milestones',
      {
        title: title.data,
        description: description.data ?? null,
        due_on: dueOn.data ?? null,
        state: state.data ?? 'open',
      },
    );
  }

  async listMilestones(
    input: ListMilestonesInput,
  ): Promise<GitHubResult<readonly GitHubMilestone[]>> {
    const operation = 'milestones.list';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const pagination = validatePagination(input, operation);
    if (!pagination.ok) {
      return pagination;
    }
    const state = validateEnum<GitHubMilestoneListState>(
      input.state,
      'state',
      ['open', 'closed', 'all'],
      operation,
    );
    if (!state.ok) {
      return state;
    }

    const args = [
      'api',
      apiPath(repository.data, 'milestones'),
      '--method',
      'GET',
      '--field',
      `state=${state.data ?? 'open'}`,
      '--field',
      `per_page=${pagination.data.perPage}`,
    ];
    if (pagination.data.page !== undefined) {
      args.push('--field', `page=${pagination.data.page}`);
    } else if (pagination.data.paginate) {
      args.push('--paginate', '--slurp');
    }

    const result = await this.runJson(operation, args);
    if (!result.ok) {
      return result;
    }
    return parseMilestones(result.data, operation);
  }

  async getMilestone(
    input: GetMilestoneInput,
  ): Promise<GitHubResult<GitHubMilestone>> {
    const operation = 'milestones.get';
    const repository = validateRepository(input.repository, operation);
    if (!repository.ok) {
      return repository;
    }
    const number = validatePositiveInteger(input.number, 'number', operation);
    if (!number.ok) {
      return number;
    }

    const result = await this.runJson(operation, [
      'api',
      apiPath(repository.data, `milestones/${number.data}`),
      '--method',
      'GET',
    ]);
    if (!result.ok) {
      return result;
    }
    return parseMilestone(result.data, operation);
  }

  async evaluateMilestone(
    input: GetMilestoneInput,
  ): Promise<GitHubResult<MilestoneEvaluation>> {
    const milestone = await this.getMilestone(input);
    if (!milestone.ok) {
      return milestone;
    }

    const openItems = milestone.data.openIssues;
    const closedItems = milestone.data.closedIssues;
    const totalItems = openItems + closedItems;
    const itemStatus = totalItems === 0 ? 'empty' : 'has_items';
    let dueDateStatus: MilestoneEvaluation['dueDateStatus'] = 'no_due_date';

    if (milestone.data.dueOn !== null) {
      const dueAt = Date.parse(milestone.data.dueOn);
      if (closedItems === totalItems && totalItems > 0) {
        dueDateStatus = 'complete';
      } else if (Number.isFinite(dueAt) && dueAt <= this.now().getTime()) {
        dueDateStatus = 'overdue';
      } else {
        dueDateStatus = 'upcoming';
      }
    }

    return success({
      milestone: milestone.data,
      totalItems,
      openItems,
      closedItems,
      completionPercentage:
        totalItems === 0
          ? null
          : Math.round((closedItems / totalItems) * 10_000) / 100,
      itemStatus,
      dueDateStatus,
    });
  }

  private async runIssueMutation(
    operation: string,
    repository: string,
    method: 'POST' | 'PATCH',
    path: string,
    payload: Record<string, unknown>,
  ): Promise<GitHubResult<GitHubIssue>> {
    const result = await this.runApiJson(
      operation,
      apiPath(repository, path),
      method,
      payload,
    );
    if (!result.ok) {
      return result;
    }
    return parseIssue(result.data, operation);
  }

  private async runMilestoneMutation(
    operation: string,
    repository: string,
    method: 'POST' | 'PATCH',
    path: string,
    payload: Record<string, unknown>,
  ): Promise<GitHubResult<GitHubMilestone>> {
    const result = await this.runApiJson(
      operation,
      apiPath(repository, path),
      method,
      payload,
    );
    if (!result.ok) {
      return result;
    }
    return parseMilestone(result.data, operation);
  }

  private async runApiJson(
    operation: string,
    endpoint: string,
    method: string,
    payload?: unknown,
  ): Promise<GitHubResult<unknown>> {
    const args = ['api', endpoint, '--method', method];
    const options =
      payload === undefined
        ? undefined
        : {
            input: JSON.stringify(payload),
          };
    if (payload !== undefined) {
      args.push('--input', '-');
    }
    return this.runJson(operation, args, options);
  }

  private async runJson(
    operation: string,
    args: readonly string[],
    options?: { readonly input?: string },
  ): Promise<GitHubResult<unknown>> {
    const result = await this.runSuccessful(operation, args, options);
    if (!result.ok) {
      return result;
    }
    return parseJson(result.data.stdout, operation);
  }

  private async runSuccessful(
    operation: string,
    args: readonly string[],
    options?: { readonly input?: string },
  ): Promise<GitHubResult<CommandExecutionResult>> {
    const result = await this.runRaw(operation, args, options);
    if (!result.ok) {
      return result;
    }
    if (result.data.exitCode !== 0) {
      return cliExitFailure(operation, result.data);
    }
    return success(result.data);
  }

  private async runRaw(
    operation: string,
    args: readonly string[],
    options?: { readonly input?: string },
  ): Promise<GitHubResult<CommandExecutionResult>> {
    try {
      const result = await this.runner.execute(args, {
        input: options?.input,
        timeoutMs: this.timeoutMs,
      });
      return success(result);
    } catch (error) {
      return commandRunnerFailure(operation, error);
    }
  }

  private validateReference(
    value: string,
    field: string,
    operation: string,
  ): GitHubResult<string> {
    const validated = validateRequiredText(value, field, operation);
    if (!validated.ok) {
      return validated;
    }
    if (/\s/.test(validated.data)) {
      return {
        ok: false,
        error: {
          category: 'validation',
          operation,
          message: `${field} must not contain whitespace.`,
        } satisfies GitHubError,
      };
    }
    return validated;
  }

  private webUrl(repository: string, path: string): string {
    return `https://${this.hostname}/${repository}/${path}`;
  }
}
