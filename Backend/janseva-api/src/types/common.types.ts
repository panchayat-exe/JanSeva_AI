// Standard API response shape used across all endpoints
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  timestamp: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: FieldError[];
  code: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
