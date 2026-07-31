import { authenticatedFetch, AuthenticatedUser } from './auth';

export type WorkspaceStateKey = 'ai_writer' | 'grammar_checker' | 'paraphraser';

export async function loadWorkspaceState<T>(user: AuthenticatedUser | null | undefined, key: WorkspaceStateKey): Promise<T | null> {
  if (!user || user.guest) return null;
  const response = await authenticatedFetch(user, `/api/account/state/${key}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Saved workspace state could not be loaded.');
  return body.value ?? null;
}

export async function saveWorkspaceState<T>(user: AuthenticatedUser | null | undefined, key: WorkspaceStateKey, value: T): Promise<void> {
  if (!user || user.guest) return;
  const response = await authenticatedFetch(user, `/api/account/state/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Workspace state could not be saved.');
}
