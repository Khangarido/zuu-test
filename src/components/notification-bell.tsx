"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Notification = {
  id: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

function relativeTime(d: string) {
  try {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (s < 60) return `${s}с өмнө`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}м өмнө`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}ц өмнө`
    return `${Math.floor(h / 24)}х өмнө`
  } catch { return "" }
}

export function NotificationBell({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  /* ── Initial unread count ─────────────────────────────────────────── */
  useEffect(() => {
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false)
      .then(({ count }) => setUnreadCount(count ?? 0))
  }, [supabase, userId])

  /* ── Realtime: increment count on new INSERT ──────────────────────── */
  useEffect(() => {
    const channel = supabase
      .channel(`notif_bell_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadCount(prev => prev + 1)
          // If dropdown is open, append the new notification
          if (open) fetchNotifications()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId, open])

  /* ── Fetch full list (lazy, on dropdown open) ─────────────────────── */
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, link, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
    setNotifications(data ?? [])
    setLoading(false)
  }, [supabase, userId])

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (val) fetchNotifications()
  }

  /* ── Click a single notification ─────────────────────────────────── */
  async function handleNotifClick(notif: Notification) {
    if (!notif.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", notif.id)
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    setOpen(false)
    if (notif.link) router.push(notif.link)
  }

  /* ── Mark all read ────────────────────────────────────────────────── */
  async function handleMarkAllRead() {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false)
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const badgeLabel = unreadCount >= 9 ? "9+" : String(unreadCount)

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9 cursor-pointer" aria-label="Мэдэгдэл">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white leading-none">
              {badgeLabel}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">Мэдэгдэл</p>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              Бүгдийг уншсан болгох
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="size-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm text-muted-foreground">Мэдэгдэл байхгүй</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors cursor-pointer ${
                    !notif.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Unread dot */}
                    <span className={`mt-1.5 size-2 rounded-full shrink-0 ${!notif.read ? "bg-rose-500" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{notif.title}</p>
                      {notif.body && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notif.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">{relativeTime(notif.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
