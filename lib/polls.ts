// ============================================================
// lib/polls.ts — Pure vote-tallying for group polls. No network.
//   Aggregates raw votes into per-option counts + percentages and
//   picks a strict winner (null on a tie or zero votes).
// ============================================================

export interface PollTally {
  optionId: string
  votes: number
  /** Share of total votes, rounded to an integer percent (0 when no votes). */
  pct: number
}

export interface PollResults {
  total: number
  tallies: PollTally[]
  /** Option id leading by a strict margin, or null (tie / no votes). */
  winnerId: string | null
}

/**
 * Tally votes across the given option ids.
 * @param optionIds  every option of the poll (so zero-vote options appear too)
 * @param votes      one entry per cast vote, referencing an option id
 */
export function tallyVotes(optionIds: string[], votes: { option_id: string }[]): PollResults {
  const counts = new Map<string, number>()
  for (const id of optionIds) counts.set(id, 0)
  let total = 0
  for (const v of votes) {
    if (counts.has(v.option_id)) {
      counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1)
      total += 1
    }
  }

  const tallies: PollTally[] = optionIds.map((optionId) => {
    const n = counts.get(optionId) ?? 0
    return { optionId, votes: n, pct: total === 0 ? 0 : Math.round((n / total) * 100) }
  })

  // Strict winner: unique maximum with at least one vote.
  let winnerId: string | null = null
  let top = 0
  let tied = false
  for (const t of tallies) {
    if (t.votes > top) {
      top = t.votes
      winnerId = t.optionId
      tied = false
    } else if (t.votes === top && top > 0) {
      tied = true
    }
  }
  return { total, tallies, winnerId: tied || top === 0 ? null : winnerId }
}
