import { validationFailure } from './errors';
import type { GitHubResult, PaginationInput } from './types';

const REPOSITORY_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function validateRepository(
  repository: string,
  operation: string,
): GitHubResult<string> {
  if (!REPOSITORY_PATTERN.test(repository)) {
    return validationFailure(
      operation,
      'repository must be an explicit owner/repository value without shell or URL syntax.',
    );
  }

  return { ok: true, data: repository };
}

export function validatePositiveInteger(
  value: number,
  field: string,
  operation: string,
): GitHubResult<number> {
  if (!Number.isInteger(value) || value < 1) {
    return validationFailure(operation, `${field} must be a positive integer.`);
  }

  return { ok: true, data: value };
}

export function validateRequiredText(
  value: string,
  field: string,
  operation: string,
): GitHubResult<string> {
  if (value.trim().length === 0) {
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

export function validateOptionalText(
  value: string | undefined,
  field: string,
  operation: string,
): GitHubResult<string | undefined> {
  if (value === undefined) {
    return { ok: true, data: undefined };
  }
  if (value.includes('\u0000')) {
    return validationFailure(
      operation,
      `${field} must not contain NUL characters.`,
    );
  }

  return { ok: true, data: value };
}

export function validateCollection(
  values: readonly string[] | undefined,
  field: string,
  operation: string,
): GitHubResult<readonly string[] | undefined> {
  if (values === undefined) {
    return { ok: true, data: undefined };
  }
  if (values.some((value) => value.includes('\u0000'))) {
    return validationFailure(
      operation,
      `${field} must not contain NUL characters.`,
    );
  }

  return { ok: true, data: values };
}

export function validatePagination(
  input: PaginationInput,
  operation: string,
): GitHubResult<Required<Pick<PaginationInput, 'perPage'>> & PaginationInput> {
  const page = input.page ?? undefined;
  const perPage = input.perPage ?? 100;

  if (page !== undefined && (!Number.isInteger(page) || page < 1)) {
    return validationFailure(operation, 'page must be a positive integer.');
  }
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
    return validationFailure(
      operation,
      'perPage must be an integer from 1 to 100.',
    );
  }

  return {
    ok: true,
    data: {
      ...input,
      page,
      perPage,
      paginate: input.paginate ?? page === undefined,
    },
  };
}

export function validateLimit(
  value: number | undefined,
  operation: string,
): GitHubResult<number> {
  const limit = value ?? 30;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    return validationFailure(
      operation,
      'limit must be an integer from 1 to 1000.',
    );
  }

  return { ok: true, data: limit };
}

export function validateEnum<T extends string>(
  value: T | undefined,
  field: string,
  allowed: readonly T[],
  operation: string,
): GitHubResult<T | undefined> {
  if (value !== undefined && !allowed.includes(value)) {
    return validationFailure(
      operation,
      `${field} must be one of: ${allowed.join(', ')}.`,
    );
  }

  return { ok: true, data: value };
}
