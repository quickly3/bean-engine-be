export function normalizePagination(
  page?: string | number,
  pageSize?: string | number,
) {
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSizeNum = Math.min(1000, Math.max(1, Number(pageSize) || 20));

  return {
    page: pageNum,
    pageSize: pageSizeNum,
    skip: (pageNum - 1) * pageSizeNum,
    take: pageSizeNum,
  };
}
