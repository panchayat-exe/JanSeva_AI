import type { PaginationQuery, PaginationMeta } from '../types/common.types';
import { CONSTANTS } from '../config/constants';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(query: PaginationQuery): PaginationOptions {
  const page = Math.max(1, Number(query.page) || CONSTANTS.DEFAULT_PAGE);
  const limit = Math.min(
    CONSTANTS.MAX_LIMIT,
    Math.max(1, Number(query.limit) || CONSTANTS.DEFAULT_LIMIT),
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
