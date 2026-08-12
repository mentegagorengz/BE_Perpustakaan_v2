import { PaginationMeta } from './paginated-result.interface';

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorPayload {
  code: string;
  details: FieldError[] | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  /** Ada pada envelope sukses; dihilangkan pada envelope error. */
  data?: T | null;
  /** Hanya pada envelope error. */
  error?: ApiErrorPayload | null;
  /** Hanya pada endpoint list/paginasi. */
  meta?: PaginationMeta;
}
