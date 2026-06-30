export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends'

export function relationFrom(
  row: { requester_id: string; addressee_id: string; status: 'pending' | 'accepted' } | null,
  myId: string
): FriendshipStatus {
  if (!row) return 'none'
  if (row.status === 'accepted') return 'friends'
  return row.requester_id === myId ? 'pending_sent' : 'pending_received'
}
