export type GitHubErrorCategory =
  | 'validation'
  | 'cli_unavailable'
  | 'authentication'
  | 'permission'
  | 'not_found'
  | 'conflict'
  | 'timeout'
  | 'cli_exit'
  | 'parse'
  | 'unknown';

export interface GitHubError {
  readonly category: GitHubErrorCategory;
  readonly operation: string;
  readonly message: string;
  readonly exitCode?: number;
  readonly stderr?: string;
}

export type GitHubResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: GitHubError };

export interface CommandExecutionOptions {
  readonly timeoutMs?: number;
  readonly input?: string;
}

export interface CommandExecutionResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
}

export interface GitHubCommandRunner {
  execute(
    args: readonly string[],
    options?: CommandExecutionOptions,
  ): Promise<CommandExecutionResult>;
}

export interface GitHubCliClientOptions {
  readonly runner?: GitHubCommandRunner;
  readonly hostname?: string;
  readonly timeoutMs?: number;
  readonly now?: () => Date;
}

export type GitHubAuthenticationStatus =
  | 'authenticated'
  | 'unauthenticated'
  | 'unknown';

export interface GitHubHealth {
  readonly cli: {
    readonly available: true;
    readonly version: string;
  };
  readonly authentication: {
    readonly host: string;
    readonly status: GitHubAuthenticationStatus;
    readonly account: string | null;
    readonly diagnostic: string | null;
  };
  readonly canRead: boolean;
  readonly canWrite: boolean;
}

export interface PaginationInput {
  readonly page?: number;
  readonly perPage?: number;
  readonly paginate?: boolean;
}

export interface PaginationInfo {
  readonly page: number | null;
  readonly perPage: number;
  readonly hasNextPage: boolean | null;
}

export interface RepositoryRequest {
  readonly repository: string;
}

export interface GitHubUser {
  readonly login: string | null;
  readonly name: string | null;
  readonly email: string | null;
  readonly avatarUrl: string | null;
  readonly url: string | null;
}

export interface GitHubLabel {
  readonly name: string;
  readonly color: string | null;
  readonly description: string | null;
  readonly url: string | null;
}

export type GitHubIssueState = 'open' | 'closed';
export type GitHubIssueListState = GitHubIssueState | 'all';

export interface GitHubMilestoneReference {
  readonly number: number;
  readonly title: string;
  readonly state: 'open' | 'closed';
  readonly description: string | null;
  readonly openIssues: number;
  readonly closedIssues: number;
  readonly dueOn: string | null;
  readonly url: string | null;
}

export interface GitHubIssue {
  readonly id: string | null;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: GitHubIssueState;
  readonly url: string;
  readonly author: GitHubUser | null;
  readonly assignees: readonly GitHubUser[];
  readonly labels: readonly GitHubLabel[];
  readonly milestone: GitHubMilestoneReference | null;
  readonly commentCount: number;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly closedAt: string | null;
  readonly stateReason: string | null;
  readonly isPinned: boolean;
}

export interface ListIssuesInput extends RepositoryRequest {
  readonly state?: GitHubIssueListState;
  readonly labels?: readonly string[];
  readonly assignee?: string;
  readonly milestone?: string;
  readonly search?: string;
  readonly limit?: number;
}

export interface GetIssueInput extends RepositoryRequest {
  readonly number: number;
}

export interface CreateIssueInput extends RepositoryRequest {
  readonly title: string;
  readonly body?: string | null;
  readonly labels?: readonly string[];
  readonly assignees?: readonly string[];
  readonly milestone?: number | null;
}

export interface UpdateIssueInput extends RepositoryRequest {
  readonly number: number;
  readonly title?: string;
  readonly body?: string | null;
  readonly state?: GitHubIssueState;
  readonly labels?: readonly string[];
  readonly assignees?: readonly string[];
  readonly milestone?: number | null;
}

export interface DeleteIssueInput extends RepositoryRequest {
  readonly number: number;
}

export interface DeletedIssue {
  readonly repository: string;
  readonly number: number;
  readonly url: string;
  readonly deleted: true;
}

export interface GitHubCommitPerson {
  readonly name: string | null;
  readonly email: string | null;
  readonly date: string | null;
  readonly user: GitHubUser | null;
}

export interface GitHubCommitParent {
  readonly sha: string;
  readonly url: string | null;
}

export interface GitHubCommitFile {
  readonly filename: string;
  readonly status: string | null;
  readonly additions: number;
  readonly deletions: number;
  readonly changes: number;
  readonly blobUrl: string | null;
  readonly rawUrl: string | null;
  readonly contentsUrl: string | null;
}

export interface GitHubCommitStats {
  readonly additions: number;
  readonly deletions: number;
  readonly total: number;
}

export interface GitHubCommit {
  readonly sha: string;
  readonly message: string;
  readonly title: string;
  readonly url: string;
  readonly author: GitHubCommitPerson | null;
  readonly committer: GitHubCommitPerson | null;
  readonly authoredAt: string | null;
  readonly committedAt: string | null;
  readonly parents: readonly GitHubCommitParent[];
  readonly stats: GitHubCommitStats | null;
  readonly files: readonly GitHubCommitFile[];
}

export interface ListCommitsInput extends RepositoryRequest, PaginationInput {
  readonly ref?: string;
}

export interface GetCommitInput extends RepositoryRequest {
  readonly sha: string;
}

export interface CommitListResult {
  readonly items: readonly GitHubCommit[];
  readonly pagination: PaginationInfo;
}

export type GitHubPullRequestState = 'open' | 'closed' | 'merged';
export type GitHubPullRequestListState = GitHubPullRequestState | 'all';

export interface GitHubPullRequestFile {
  readonly filename: string;
  readonly status: string | null;
  readonly additions: number;
  readonly deletions: number;
  readonly changes: number;
  readonly blobUrl: string | null;
  readonly rawUrl: string | null;
  readonly contentsUrl: string | null;
}

export interface GitHubPullRequestCommit {
  readonly sha: string;
  readonly message: string;
  readonly author: GitHubUser | null;
  readonly committedAt: string | null;
}

export interface GitHubPullRequestReview {
  readonly id: string | null;
  readonly author: GitHubUser | null;
  readonly body: string | null;
  readonly state: string | null;
  readonly submittedAt: string | null;
  readonly url: string | null;
}

export interface GitHubPullRequestComment {
  readonly id: string | null;
  readonly author: GitHubUser | null;
  readonly body: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly url: string | null;
}

export interface GitHubPullRequestCheck {
  readonly name: string | null;
  readonly status: string | null;
  readonly conclusion: string | null;
  readonly state: string | null;
  readonly detailsUrl: string | null;
  readonly workflowName: string | null;
}

export interface GitHubPullRequest {
  readonly id: string | null;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: GitHubPullRequestState;
  readonly url: string;
  readonly isDraft: boolean;
  readonly author: GitHubUser | null;
  readonly assignees: readonly GitHubUser[];
  readonly labels: readonly GitHubLabel[];
  readonly milestone: GitHubMilestoneReference | null;
  readonly baseRefName: string | null;
  readonly baseRefOid: string | null;
  readonly headRefName: string | null;
  readonly headRefOid: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly closedAt: string | null;
  readonly mergedAt: string | null;
  readonly additions: number;
  readonly deletions: number;
  readonly changedFiles: number;
  readonly mergeStateStatus: string | null;
  readonly mergeable: string | null;
  readonly reviewDecision: string | null;
  readonly files: readonly GitHubPullRequestFile[];
  readonly commits: readonly GitHubPullRequestCommit[];
  readonly checks: readonly GitHubPullRequestCheck[];
  readonly reviews: readonly GitHubPullRequestReview[];
  readonly comments: readonly GitHubPullRequestComment[];
}

export interface ListPullRequestsInput extends RepositoryRequest {
  readonly state?: GitHubPullRequestListState;
  readonly labels?: readonly string[];
  readonly assignee?: string;
  readonly base?: string;
  readonly head?: string;
  readonly draft?: boolean;
  readonly search?: string;
  readonly limit?: number;
}

export interface GetPullRequestInput extends RepositoryRequest {
  readonly number: number;
}

export type GitHubPullRequestReviewEvent =
  | 'COMMENT'
  | 'APPROVE'
  | 'REQUEST_CHANGES';

export interface SubmitPullRequestReviewInput extends RepositoryRequest {
  readonly number: number;
  readonly event: GitHubPullRequestReviewEvent;
  readonly body: string;
}

export interface SubmitPullRequestReviewResult {
  readonly repository: string;
  readonly number: number;
  readonly id: string | null;
  readonly event: GitHubPullRequestReviewEvent;
  readonly body: string;
  readonly state: string | null;
  readonly url: string | null;
}

export type GitHubPullRequestMergeMethod = 'merge' | 'squash' | 'rebase';

export interface MergePullRequestInput extends RepositoryRequest {
  readonly number: number;
  readonly method: GitHubPullRequestMergeMethod;
  readonly sha?: string;
  readonly commitTitle?: string;
  readonly commitMessage?: string;
}

export interface MergePullRequestResult {
  readonly repository: string;
  readonly number: number;
  readonly url: string;
  readonly method: GitHubPullRequestMergeMethod;
  readonly merged: boolean;
  readonly sha: string | null;
  readonly message: string;
}

export type GitHubMilestoneState = 'open' | 'closed';
export type GitHubMilestoneListState = GitHubMilestoneState | 'all';

export interface GitHubMilestone {
  readonly id: string | null;
  readonly number: number;
  readonly title: string;
  readonly description: string | null;
  readonly state: GitHubMilestoneState;
  readonly openIssues: number;
  readonly closedIssues: number;
  readonly dueOn: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly closedAt: string | null;
  readonly creator: GitHubUser | null;
  readonly url: string;
}

export interface CreateMilestoneInput extends RepositoryRequest {
  readonly title: string;
  readonly description?: string | null;
  readonly dueOn?: string | null;
  readonly state?: GitHubMilestoneState;
}

export interface ListMilestonesInput
  extends RepositoryRequest,
    PaginationInput {
  readonly state?: GitHubMilestoneListState;
}

export interface GetMilestoneInput extends RepositoryRequest {
  readonly number: number;
}

export type MilestoneItemStatus = 'empty' | 'has_items';
export type MilestoneDueDateStatus =
  | 'no_due_date'
  | 'upcoming'
  | 'overdue'
  | 'complete';

export interface MilestoneEvaluation {
  readonly milestone: GitHubMilestone;
  readonly totalItems: number;
  readonly openItems: number;
  readonly closedItems: number;
  readonly completionPercentage: number | null;
  readonly itemStatus: MilestoneItemStatus;
  readonly dueDateStatus: MilestoneDueDateStatus;
}
