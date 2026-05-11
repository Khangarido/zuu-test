import Link from "next/link";
import Image from "next/image";
import { LogOut, LayoutDashboard, ShieldCheck, Trophy, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppShellProps {
  children: React.ReactNode;
  fullName: string;
  email: string;
  role: "student" | "admin";
  isAdmin?: boolean;
  username?: string | null;
  avatarUrl?: string | null;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AppShell({
  children,
  fullName,
  email,
  isAdmin,
  username,
  avatarUrl,
}: AppShellProps) {
  const abbr = initials(fullName) || "?";

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity flex items-center gap-2.5">
            <Image src="/logo.png" alt="Zuu Academy" width={40} height={40} className="h-10 w-10 rounded-xl object-cover" priority />
            <span className="font-bold text-lg tracking-tight hidden sm:inline-block">Zuu Academy</span>
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 cursor-pointer"
                >
                  <Avatar className="size-7 ring-2 ring-primary/20">
                    <AvatarImage src={avatarUrl ?? undefined} alt={fullName} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-semibold">
                      {abbr}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block max-w-[160px] truncate text-sm">
                    {fullName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="pb-1">
                  <div className="font-semibold">{fullName}</div>
                  <div className="text-xs text-muted-foreground truncate font-normal">
                    {email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer flex items-center gap-2">
                    <LayoutDashboard className="size-4" />
                    Самбар
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={username ? `/profile/${username}` : "/profile/me"}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <User className="size-4" />
                    Профайл
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/leaderboard" className="cursor-pointer flex items-center gap-2">
                    <Trophy className="size-4" />
                    Эрэмбэ
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer flex items-center gap-2">
                      <ShieldCheck className="size-4" />
                      Админ хэсэг
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action="/auth/signout" method="post" className="w-full">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 cursor-pointer text-destructive"
                    >
                      <LogOut className="size-4" />
                      Гарах
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
