export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

/** Bangun meta pagination sesuai API_STANDARDS.md §2.B (snake_case). */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const total_pages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total_items: total,
    total_pages,
    has_next_page: page < total_pages,
    has_prev_page: page > 1,
  };
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
