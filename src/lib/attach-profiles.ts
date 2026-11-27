/**
 * Attach `profiles` rows to a list by id, without relying on a PostgREST foreign-key embed
 * (which silently returns nothing when the FK is missing).
 */
export async function attachProfiles<T extends Record<string, any>>(
  client: any,
  rows: T[],
  idKey: string,
  columns = "full_name, username, avatar_url",
): Promise<(T & { profiles: any | null })[]> {
  const ids = Array.from(new Set(rows.map((r) => r[idKey]).filter(Boolean)))
  const map = new Map<string, any>()
  if (ids.length > 0) {
    const { data } = await client.from("profiles").select(`id, ${columns}`).in("id", ids)
    for (const p of data ?? []) map.set(p.id, p)
  }
  return rows.map((r) => ({ ...r, profiles: map.get(r[idKey]) ?? null }))
}
