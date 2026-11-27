export function formatMNT(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")}₮`
}

/** "30 хоногийн эрх" / "2027-06-15 хүртэл" */
export function describeAccess(c: { access_mode?: string | null; access_end_date?: string | null; access_days?: number | null }): string {
  if (c.access_mode === "fixed_date" && c.access_end_date) {
    return `${new Date(c.access_end_date).toISOString().slice(0, 10)} хүртэл`
  }
  return `${c.access_days ?? 30} хоногийн эрх`
}
