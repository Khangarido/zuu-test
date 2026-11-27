/**
 * Privacy-safe shaping of leaderboard rows. Everything a student's browser receives goes through
 * here: other students are reduced to a rank, a score and a tier. Names, usernames, avatars, grades
 * and ids of other students never leave the server for non-admin viewers.
 */

export type Identity = {
  name: string | null
  username: string | null
  avatar_url: string | null
  grade: string | null
}

export type RankRow = {
  rank: number
  /** rank score (score tab) or EXP points (EXP tab) */
  value: number
  tier: string | null
  me: boolean
  /** only the viewer's own row, or every row for admins */
  identity?: Identity
}

type Raw = {
  id: string
  value: number | null
  tier?: string | null
  identity?: Identity
}

export function shapeRows(
  rows: Raw[],
  opts: { viewerId: string; viewerIdentity: Identity; showIdentity: boolean }
): RankRow[] {
  return rows.map((r, i) => {
    const me = r.id === opts.viewerId
    const out: RankRow = { rank: i + 1, value: r.value ?? 0, tier: r.tier ?? null, me }
    if (me) out.identity = opts.viewerIdentity
    else if (opts.showIdentity && r.identity) out.identity = r.identity
    return out
  })
}

/** Position of a viewer who is not in the list: 1 + students with a strictly higher value. */
export function outsideRank(higherCount: number | null | undefined): number {
  return (higherCount ?? 0) + 1
}

export const GRADE_VALUES = [
  ...Array.from({ length: 12 }, (_, i) => String(i + 1)),
  "graduated",
  "other",
]

export const SUBJECT_VALUES = [
  "Математик", "Монгол хэл", "Англи хэл", "Физик",
  "Хими", "Биологи", "Газарзүй", "Түүх", "Нийгэм", "Мэдээлэл зүй",
]
