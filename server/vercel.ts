/**
 * Vercel rewrites every API request to a single serverless function. Restore the
 * original Express URL without reading or transforming the request body (the
 * Razorpay webhook signature must be verified against its original bytes).
 */
export function restoreApiUrl(rawUrl: string | undefined): string {
  const rewritten = new URL(rawUrl || '/api/index', 'http://localhost');
  const pathParameter = rewritten.searchParams.get('path');

  if (!pathParameter) return rewritten.pathname + rewritten.search;

  rewritten.searchParams.delete('path');
  const normalizedPath = pathParameter
    .split('/')
    .map(segment => { try { return decodeURIComponent(segment); } catch { return ''; } })
    .filter(segment => Boolean(segment) && segment !== '.' && segment !== '..')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const query = rewritten.searchParams.toString();
  return `/api/${normalizedPath}${query ? `?${query}` : ''}`;
}
