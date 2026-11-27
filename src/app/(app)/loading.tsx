// Shown instantly while any page in the signed-in area loads, so a click never looks "dead".
export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-4xl flex-col items-center justify-center gap-4 py-16" role="status" aria-live="polite">
      <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <p className="text-sm text-muted-foreground">Ачаалж байна…</p>
    </div>
  )
}
