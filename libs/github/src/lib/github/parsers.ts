import { jsonFailure, parseFailure, success } from './errors';
import type {
  GitHubCommit,
  GitHubCommitFile,
  GitHubCommitParent,
  GitHubCommitPerson,
  GitHubCommitStats,
  GitHubIssue,
  GitHubLabel,
  GitHubMilestone,
  GitHubMilestoneReference,
  GitHubPullRequest,
  GitHubPullRequestCheck,
  GitHubPullRequestComment,
  GitHubPullRequestCommit,
  GitHubPullRequestFile,
  GitHubPullRequestReview,
  GitHubResult,
  GitHubUser,
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

function normalizedString(value: unknown): string | null {
  const string = stringValue(value);
  return string === null ? null : string.toLowerCase();
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
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

function mapUser(value: unknown): GitHubUser | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return {
    login: firstString(record, 'login', 'username'),
    name: firstString(record, 'name'),
    email: firstString(record, 'email'),
    avatarUrl: firstString(record, 'avatarUrl', 'avatar_url'),
    url: firstString(record, 'url', 'html_url'),
  };
}

function mapLabels(value: unknown): readonly GitHubLabel[] {
  const labels = asArray(value) ?? [];
  return labels.flatMap((entry) => {
    const record = asRecord(entry);
    const name = record ? firstString(record, 'name') : stringValue(entry);
    return name === null
      ? []
      : [
          {
            name,
            color: record ? firstString(record, 'color') : null,
            description: record ? firstString(record, 'description') : null,
            url: record ? firstString(record, 'url', 'html_url') : null,
          },
        ];
  });
}

function mapMilestoneReference(
  value: unknown,
): GitHubMilestoneReference | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const number = firstNumber(record, 'number');
  const title = firstString(record, 'title');
  if (number === null || title === null) {
    return null;
  }

  const state = normalizedString(record.state);
  return {
    number,
    title,
    state: state === 'closed' ? 'closed' : 'open',
    description: firstString(record, 'description'),
    openIssues: firstNumber(record, 'openIssues', 'open_issues') ?? 0,
    closedIssues: firstNumber(record, 'closedIssues', 'closed_issues') ?? 0,
    dueOn: firstString(record, 'dueOn', 'due_on'),
    url: firstString(record, 'url', 'html_url'),
  };
}

export function parseJson(
  stdout: string,
  operation: string,
): GitHubResult<unknown> {
  try {
    return success(JSON.parse(stdout) as unknown);
  } catch (error) {
    return jsonFailure(operation, error);
  }
}

export function flattenPages(value: unknown): readonly unknown[] {
  const array = asArray(value) ?? [];
  if (array.every((entry) => Array.isArray(entry))) {
    return array.flatMap((entry) => asArray(entry) ?? []);
  }
  return array;
}

export function parseIssue(
  value: unknown,
  operation: string,
): GitHubResult<GitHubIssue> {
  const record = asRecord(value);
  const number = record ? firstNumber(record, 'number') : null;
  const title = record ? firstString(record, 'title') : null;
  const url = record ? firstString(record, 'url', 'html_url') : null;
  if (record === null || number === null || title === null || url === null) {
    return parseFailure(
      operation,
      'The GitHub CLI returned an issue without number, title, or URL.',
    );
  }

  return success({
    id: idValue(record.id),
    number,
    title,
    body: firstString(record, 'body'),
    state: normalizedString(record.state) === 'closed' ? 'closed' : 'open',
    url,
    author: mapUser(record.author ?? record.user),
    assignees: (asArray(record.assignees) ?? []).flatMap((entry) => {
      const user = mapUser(entry);
      return user === null ? [] : [user];
    }),
    labels: mapLabels(record.labels),
    milestone: mapMilestoneReference(record.milestone),
    commentCount: firstNumber(record, 'comments', 'commentCount') ?? 0,
    createdAt: firstString(record, 'createdAt', 'created_at'),
    updatedAt: firstString(record, 'updatedAt', 'updated_at'),
    closedAt: firstString(record, 'closedAt', 'closed_at'),
    stateReason: firstString(record, 'stateReason', 'state_reason'),
    isPinned: booleanValue(record.isPinned),
  });
}

export function parseIssues(
  value: unknown,
  operation: string,
): GitHubResult<readonly GitHubIssue[]> {
  const array = asArray(value);
  if (array === null) {
    return parseFailure(
      operation,
      'The GitHub CLI returned a non-array issue list.',
    );
  }

  const issues: GitHubIssue[] = [];
  for (const entry of array) {
    const parsed = parseIssue(entry, operation);
    if (!parsed.ok) {
      return parsed;
    }
    issues.push(parsed.data);
  }
  return success(issues);
}

function mapCommitPerson(
  value: unknown,
  userValue: unknown,
): GitHubCommitPerson | null {
  const record = asRecord(value);
  const user = mapUser(userValue);
  if (!record && !user) {
    return null;
  }
  return {
    name: record ? firstString(record, 'name') : null,
    email: record ? firstString(record, 'email') : null,
    date: record ? firstString(record, 'date') : null,
    user,
  };
}

function mapCommitParent(value: unknown): GitHubCommitParent | null {
  const record = asRecord(value);
  const sha = record ? firstString(record, 'sha') : stringValue(value);
  return sha === null
    ? null
    : {
        sha,
        url: record ? firstString(record, 'url', 'html_url') : null,
      };
}

function mapCommitStats(value: unknown): GitHubCommitStats | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    additions: firstNumber(record, 'additions') ?? 0,
    deletions: firstNumber(record, 'deletions') ?? 0,
    total: firstNumber(record, 'total') ?? 0,
  };
}

function mapCommitFile(value: unknown): GitHubCommitFile | null {
  const record = asRecord(value);
  const filename = record ? firstString(record, 'filename') : null;
  if (record === null || filename === null) {
    return null;
  }
  return {
    filename,
    status: firstString(record, 'status'),
    additions: firstNumber(record, 'additions') ?? 0,
    deletions: firstNumber(record, 'deletions') ?? 0,
    changes: firstNumber(record, 'changes') ?? 0,
    blobUrl: firstString(record, 'blob_url', 'blobUrl'),
    rawUrl: firstString(record, 'raw_url', 'rawUrl'),
    contentsUrl: firstString(record, 'contents_url', 'contentsUrl'),
  };
}

export function parseCommit(
  value: unknown,
  operation: string,
): GitHubResult<GitHubCommit> {
  const record = asRecord(value);
  if (!record) {
    return parseFailure(
      operation,
      'The GitHub CLI returned a non-object commit.',
    );
  }

  const commit = asRecord(record.commit) ?? record;
  const sha = firstString(record, 'sha', 'oid');
  const message =
    firstString(commit, 'message') ?? firstString(record, 'message');
  const url = firstString(record, 'html_url', 'url') ?? '';
  if (sha === null || message === null || url.length === 0) {
    return parseFailure(
      operation,
      'The GitHub CLI returned a commit without SHA, message, or URL.',
    );
  }

  const title = message.split(/\r?\n/, 1)[0] ?? message;
  return success({
    sha,
    message,
    title,
    url,
    author: mapCommitPerson(commit.author, record.author),
    committer: mapCommitPerson(commit.committer, record.committer),
    authoredAt:
      firstString(commit, 'authorDate') ??
      firstString(asRecord(commit.author) ?? {}, 'date'),
    committedAt:
      firstString(commit, 'committerDate') ??
      firstString(asRecord(commit.committer) ?? {}, 'date'),
    parents: (asArray(record.parents) ?? []).flatMap((entry) => {
      const parent = mapCommitParent(entry);
      return parent === null ? [] : [parent];
    }),
    stats: mapCommitStats(record.stats),
    files: (asArray(record.files) ?? []).flatMap((entry) => {
      const file = mapCommitFile(entry);
      return file === null ? [] : [file];
    }),
  });
}

export function parseCommits(
  value: unknown,
  operation: string,
): GitHubResult<readonly GitHubCommit[]> {
  const values = flattenPages(value);
  const commits: GitHubCommit[] = [];
  for (const entry of values) {
    const parsed = parseCommit(entry, operation);
    if (!parsed.ok) {
      return parsed;
    }
    commits.push(parsed.data);
  }
  return success(commits);
}

function mapPullRequestFile(value: unknown): GitHubPullRequestFile | null {
  const record = asRecord(value);
  const filename = record ? firstString(record, 'path', 'filename') : null;
  if (record === null || filename === null) {
    return null;
  }
  return {
    filename,
    status: firstString(record, 'status'),
    additions: firstNumber(record, 'additions') ?? 0,
    deletions: firstNumber(record, 'deletions') ?? 0,
    changes: firstNumber(record, 'changes') ?? 0,
    blobUrl: firstString(record, 'blobUrl', 'blob_url'),
    rawUrl: firstString(record, 'rawUrl', 'raw_url'),
    contentsUrl: firstString(record, 'contentsUrl', 'contents_url'),
  };
}

function mapPullRequestCommit(value: unknown): GitHubPullRequestCommit | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  const sha = firstString(record, 'oid', 'sha');
  if (sha === null) {
    return null;
  }
  return {
    sha,
    message:
      firstString(record, 'messageHeadline', 'message') ??
      firstString(asRecord(record.commit) ?? {}, 'message') ??
      '',
    author: mapUser(record.author ?? record.user),
    committedAt: firstString(record, 'committedDate', 'committedAt'),
  };
}

function mapPullRequestReview(value: unknown): GitHubPullRequestReview | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    id: idValue(record.id),
    author: mapUser(record.author ?? record.user),
    body: firstString(record, 'body'),
    state: firstString(record, 'state'),
    submittedAt: firstString(record, 'submittedAt', 'submitted_at'),
    url: firstString(record, 'url', 'html_url'),
  };
}

function mapPullRequestComment(
  value: unknown,
): GitHubPullRequestComment | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    id: idValue(record.id),
    author: mapUser(record.author ?? record.user),
    body: firstString(record, 'body'),
    createdAt: firstString(record, 'createdAt', 'created_at'),
    updatedAt: firstString(record, 'updatedAt', 'updated_at'),
    url: firstString(record, 'url', 'html_url'),
  };
}

function mapPullRequestCheck(value: unknown): GitHubPullRequestCheck | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    name: firstString(record, 'name', 'context'),
    status: firstString(record, 'status'),
    conclusion: firstString(record, 'conclusion'),
    state: firstString(record, 'state'),
    detailsUrl: firstString(record, 'detailsUrl', 'details_url'),
    workflowName: firstString(record, 'workflowName', 'workflow_name'),
  };
}

export function parsePullRequest(
  value: unknown,
  operation: string,
): GitHubResult<GitHubPullRequest> {
  const record = asRecord(value);
  const number = record ? firstNumber(record, 'number') : null;
  const title = record ? firstString(record, 'title') : null;
  const url = record ? firstString(record, 'url', 'html_url') : null;
  if (record === null || number === null || title === null || url === null) {
    return parseFailure(
      operation,
      'The GitHub CLI returned a pull request without number, title, or URL.',
    );
  }

  const stateValue = normalizedString(record.state);
  const mergedAt = firstString(record, 'mergedAt', 'merged_at');
  return success({
    id: idValue(record.id),
    number,
    title,
    body: firstString(record, 'body'),
    state:
      mergedAt !== null || stateValue === 'merged'
        ? 'merged'
        : stateValue === 'closed'
          ? 'closed'
          : 'open',
    url,
    isDraft: booleanValue(record.isDraft),
    author: mapUser(record.author),
    assignees: (asArray(record.assignees) ?? []).flatMap((entry) => {
      const user = mapUser(entry);
      return user === null ? [] : [user];
    }),
    labels: mapLabels(record.labels),
    milestone: mapMilestoneReference(record.milestone),
    baseRefName: firstString(record, 'baseRefName'),
    baseRefOid: firstString(record, 'baseRefOid'),
    headRefName: firstString(record, 'headRefName'),
    headRefOid: firstString(record, 'headRefOid'),
    createdAt: firstString(record, 'createdAt', 'created_at'),
    updatedAt: firstString(record, 'updatedAt', 'updated_at'),
    closedAt: firstString(record, 'closedAt', 'closed_at'),
    mergedAt,
    additions: firstNumber(record, 'additions') ?? 0,
    deletions: firstNumber(record, 'deletions') ?? 0,
    changedFiles: firstNumber(record, 'changedFiles', 'changed_files') ?? 0,
    mergeStateStatus: firstString(
      record,
      'mergeStateStatus',
      'merge_state_status',
    ),
    mergeable: firstString(record, 'mergeable'),
    reviewDecision: firstString(record, 'reviewDecision', 'review_decision'),
    files: (asArray(record.files) ?? []).flatMap((entry) => {
      const file = mapPullRequestFile(entry);
      return file === null ? [] : [file];
    }),
    commits: (asArray(record.commits) ?? []).flatMap((entry) => {
      const commit = mapPullRequestCommit(entry);
      return commit === null ? [] : [commit];
    }),
    checks: (
      asArray(record.statusCheckRollup) ??
      asArray(record.checks) ??
      []
    ).flatMap((entry) => {
      const check = mapPullRequestCheck(entry);
      return check === null ? [] : [check];
    }),
    reviews: (
      asArray(record.reviews) ??
      asArray(record.latestReviews) ??
      []
    ).flatMap((entry) => {
      const review = mapPullRequestReview(entry);
      return review === null ? [] : [review];
    }),
    comments: (asArray(record.comments) ?? []).flatMap((entry) => {
      const comment = mapPullRequestComment(entry);
      return comment === null ? [] : [comment];
    }),
  });
}

export function parsePullRequests(
  value: unknown,
  operation: string,
): GitHubResult<readonly GitHubPullRequest[]> {
  const array = asArray(value);
  if (array === null) {
    return parseFailure(
      operation,
      'The GitHub CLI returned a non-array pull request list.',
    );
  }

  const pullRequests: GitHubPullRequest[] = [];
  for (const entry of array) {
    const parsed = parsePullRequest(entry, operation);
    if (!parsed.ok) {
      return parsed;
    }
    pullRequests.push(parsed.data);
  }
  return success(pullRequests);
}

export function parseReview(
  value: unknown,
  operation: string,
): GitHubResult<GitHubPullRequestReview> {
  const review = mapPullRequestReview(value);
  return review === null
    ? parseFailure(
        operation,
        'The GitHub CLI returned an invalid pull request review.',
      )
    : success(review);
}

export function parseMilestone(
  value: unknown,
  operation: string,
): GitHubResult<GitHubMilestone> {
  const record = asRecord(value);
  const number = record ? firstNumber(record, 'number') : null;
  const title = record ? firstString(record, 'title') : null;
  const url = record ? firstString(record, 'html_url', 'url') : null;
  if (record === null || number === null || title === null || url === null) {
    return parseFailure(
      operation,
      'The GitHub CLI returned a milestone without number, title, or URL.',
    );
  }

  return success({
    id: idValue(record.id),
    number,
    title,
    description: firstString(record, 'description'),
    state: normalizedString(record.state) === 'closed' ? 'closed' : 'open',
    openIssues: firstNumber(record, 'open_issues', 'openIssues') ?? 0,
    closedIssues: firstNumber(record, 'closed_issues', 'closedIssues') ?? 0,
    dueOn: firstString(record, 'due_on', 'dueOn'),
    createdAt: firstString(record, 'created_at', 'createdAt'),
    updatedAt: firstString(record, 'updated_at', 'updatedAt'),
    closedAt: firstString(record, 'closed_at', 'closedAt'),
    creator: mapUser(record.creator),
    url,
  });
}

export function parseMilestones(
  value: unknown,
  operation: string,
): GitHubResult<readonly GitHubMilestone[]> {
  const values = flattenPages(value);
  const milestones: GitHubMilestone[] = [];
  for (const entry of values) {
    const parsed = parseMilestone(entry, operation);
    if (!parsed.ok) {
      return parsed;
    }
    milestones.push(parsed.data);
  }
  return success(milestones);
}
