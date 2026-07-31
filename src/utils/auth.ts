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
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
}

export function installPlanLimitInterceptor() {
  if (typeof window === 'undefined' || (window.fetch as any).__gxaPlanLimitAware) return () => undefined;
  const original = window.fetch.bind(window);
  const wrapped: typeof window.fetch = async (input, init) => {
    const response = await original(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (response.status === 429 && (url.startsWith('/api/') || url.startsWith(window.location.origin + '/api/'))) {
      void response.clone().json().then(body => { if (body?.code === 'PLAN_LIMIT_REACHED') window.dispatchEvent(new CustomEvent('gxa:plan-limit')); }).catch(() => undefined);
    }
    return response;
  };
  (wrapped as any).__gxaPlanLimitAware = true;
  window.fetch = wrapped;
  return () => { if (window.fetch === wrapped) window.fetch = original; };
}
