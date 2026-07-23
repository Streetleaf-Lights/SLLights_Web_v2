/**
 * Appends a query param to a path if a value is present, otherwise returns the
 * path unchanged. Used to carry the customers search query through to detail
 * pages so links back (breadcrumbs, "back to Customers") restore the filter.
 */
export function withQueryParam(path: string, key: string, value?: string | null): string {
  if (!value) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${key}=${encodeURIComponent(value)}`;
}
