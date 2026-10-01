/**
 * The database returns at most 1,000 rows per request: page through until a short page comes back.
 * `page(from, to)` runs the query with `.range(from, to)` (keep a stable `.order()` on it).
 */
export const fetchAllRows = async <T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000
): Promise<{ data: T[] | null; error: unknown }> => {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) return { data: null, error };
    all.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return { data: all, error: null };
};
