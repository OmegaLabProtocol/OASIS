import type { WorkspaceOwner } from "./owner";

export function hasWorkspaceOwner(owner: WorkspaceOwner): boolean {
  return Boolean(owner.userId || owner.inviteId);
}

export function ownerInsert(owner: WorkspaceOwner): {
  user_id: string | null;
  invite_id: string | null;
} {
  return {
    user_id: owner.userId,
    invite_id: owner.inviteId,
  };
}

type Filterable = {
  eq: (column: string, value: string) => Filterable;
  is: (column: string, value: null) => Filterable;
};

/**
 * Filter workspace rows for this owner.
 * Authenticated → user_id; invite-only → invite_id with user_id still null.
 */
export function applyOwnerFilter<T>(query: T, owner: WorkspaceOwner): T {
  const q = query as Filterable;
  if (owner.userId) return q.eq("user_id", owner.userId) as T;
  if (owner.inviteId) return q.eq("invite_id", owner.inviteId).is("user_id", null) as T;
  return query;
}
