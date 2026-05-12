"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, LogIn, LogOut } from "lucide-react"
import { toast } from "sonner"

export function JoinLeaveButton({ classId, isMember }: { classId: string; isMember: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [joined, setJoined] = useState(isMember)

  async function toggle() {
    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error("Нэвтэрнэ үү"); setBusy(false); return }

    if (joined) {
      const { error } = await supabase.from("class_members").delete()
        .eq("class_id", classId).eq("user_id", user.id)
      if (error) { toast.error("Гарахад алдаа гарлаа"); setBusy(false); return }
      setJoined(false)
      toast.success("Ангиас гарлаа")
    } else {
      const { error } = await supabase.from("class_members").insert({ class_id: classId, user_id: user.id, role: "student" })
      if (error) { toast.error("Нэгдэхэд алдаа гарлаа"); setBusy(false); return }
      setJoined(true)
      toast.success("Ангид нэгдлээ!")
    }

    setBusy(false)
    router.refresh()
  }

  return (
    <Button
      size="sm"
      variant={joined ? "outline" : "default"}
      className={joined ? "" : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"}
      onClick={toggle}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : joined ? (
        <><LogOut className="size-4 mr-1" />Гарах</>
      ) : (
        <><LogIn className="size-4 mr-1" />Нэгдэх</>
      )}
    </Button>
  )
}
