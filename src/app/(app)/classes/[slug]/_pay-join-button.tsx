"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"
import { toast } from "sonner"

export function PayJoinButton({ classId, label, note }: { classId: string; label: string; note?: string }) {
  const [busy, setBusy] = useState(false)

  async function pay() {
    setBusy(true)
    try {
      const res = await fetch("/api/classes/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Төлбөр эхлүүлж чадсангүй")
        setBusy(false)
        return
      }
      window.location.href = data.url
    } catch {
      toast.error("Сүлжээний алдаа гарлаа")
      setBusy(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Button onClick={pay} disabled={busy} className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
        {busy ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <CreditCard className="size-4 mr-1.5" />}
        {label}
      </Button>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}
