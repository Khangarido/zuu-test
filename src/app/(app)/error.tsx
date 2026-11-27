"use client"

import { useEffect } from "react"

// Any failure on a signed-in page ends here instead of a blank/dead screen.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app error]", error.digest ?? "", error.message)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold">Алдаа гарлаа</h1>
      <p className="text-sm text-muted-foreground">
        Хуудсыг ачаалж чадсангүй. Дахин оролдох эсвэл самбар руу буцна уу.
        {error.digest && <span className="mt-1 block font-mono text-xs">код: {error.digest}</span>}
      </p>
      <div className="flex gap-2">
        <button onClick={() => reset()} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent cursor-pointer">
          Дахин оролдох
        </button>
        {/* a plain link = full page load, works even if client-side navigation is broken */}
        <a href="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer">
          Самбар руу
        </a>
      </div>
    </div>
  )
}
