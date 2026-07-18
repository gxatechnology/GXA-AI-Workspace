export interface AuthenticatedUser {
  id: string;
  name?: string;
  email: string;
  subscription?: string;
  role?: string;
  adminRole?: string | null;
  sessionToken?: string;
  guest?: boolean;
}
export const authHeaders = (user?: AuthenticatedUser | null): Record<string, string> =>
  user?.sessionToken && !user.guest ? { Authorization: `Bearer ${user.sessionToken}` } : {};

export const storedUser = (): AuthenticatedUser | null => {
  try {
    const raw = localStorage.getItem('gxa_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.sessionToken ? user : null;
  } catch {
    return null;
  }
};

export async function authenticatedFetch(user: AuthenticatedUser | null | undefined, input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(authHeaders(user))) headers.set(key, value);
  return fetch(input, { ...init, headers });
}
