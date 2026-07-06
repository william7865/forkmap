// ============================================================
// lib/list-access.ts — Pure authorization decision for lists.
//   A list is editable by its owner or by any collaborator.
//   Kept pure so the rule is unit-testable without a DB.
// ============================================================

export type ListAccess = 'owner' | 'collaborator' | 'none'

/** Resolve a user's access level to a list from its owner + collaborator set. */
export function resolveListAccess(
  ownerId: string,
  collaboratorIds: string[],
  userId: string | null | undefined
): ListAccess {
  if (!userId) return 'none'
  if (userId === ownerId) return 'owner'
  return collaboratorIds.includes(userId) ? 'collaborator' : 'none'
}

/** Whether the user may add/remove items on the list. */
export function canEdit(
  ownerId: string,
  collaboratorIds: string[],
  userId: string | null | undefined
): boolean {
  return resolveListAccess(ownerId, collaboratorIds, userId) !== 'none'
}
