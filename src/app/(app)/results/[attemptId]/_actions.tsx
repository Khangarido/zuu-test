"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Back / retake buttons for the results page.
 * - shows a spinner as soon as clicked (slow pages no longer look dead)
 * - if client-side navigation has not finished within 2.5 s, falls back to a full page load
 */
export function ResultsActions({ examSetId }: { examSetId: string | null }) {
  const router = useRouter()
  const [going, setGoing] = useState<null | "back" | "retake">(null)

  // Safety net: nothing may leave the page unclickable (e.g. a modal's scroll lock left on <body>).
  useEffect(() => {
    document.body.style.pointerEvents = ""
    document.body.removeAttribute("data-scroll-locked")
  }, [])

  function go(kind: "back" | "retake", href: string) {
    if (going) return
    setGoing(kind)
    try { router.push(href) } catch { window.location.assign(href); return }
    window.setTimeout(() => {
      if (window.location.pathname + window.location.search !== href) window.location.assign(href)
    }, 2500)
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="cursor-pointer" disabled={!!going} onClick={() => go("back", "/dashboard")}>
        {going === "back" ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />}
        Буцах
      </Button>
      {examSetId && (
        <Button size="sm" className="cursor-pointer" disabled={!!going} onClick={() => go("retake", `/exam/${examSetId}?retake=1`)}>
          {going === "retake" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
          Дахин өгөх
        </Button>
      )}
    </div>
  )
}
