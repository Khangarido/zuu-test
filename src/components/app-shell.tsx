import Link from "next/link";
import { GraduationCap, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppShellProps {
  children: React.ReactNode;
  fullName: string;
  email: string;
  role: "student" | "admin";
  isAdmin?: boolean;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AppShell({ children, fullName, email, isAdmin }: AppShellProps) {
  const abbr = initials(fullName) || "?";

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold text-foreground hover:opacity-80 transition-opacity"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
              <GraduationCap className="size-4 text-white" />
            </div>
            <span className="hidden sm:block">Zuu Academy</span>
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
