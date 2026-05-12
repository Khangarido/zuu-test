import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export type ProfileCardUser = {
  username: string
  displayName: string
  bio?: string | null
  avatarUrl?: string | null
  isTeacher?: boolean
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

export function ProfileCard({ username, displayName, bio, avatarUrl, isTeacher }: ProfileCardUser) {
  return (
    <Link
      href={`/profile/${username}`}
      className="flex items-start gap-3 rounded-2xl border bg-card p-4 hover:border-primary/50 hover:bg-accent/30 transition-colors"
    >
      <Avatar className="size-10 shrink-0">
        <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-bold">
          {initials(displayName) || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-sm truncate">{displayName}</span>
          {isTeacher && (
            <Badge className="text-[10px] px-1.5 py-0 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-0">
              Багш
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">@{username}</p>
        {bio && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{bio}</p>
        )}
      </div>
    </Link>
  )
}
