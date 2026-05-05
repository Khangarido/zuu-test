import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GraduationCap, LogOut, ExternalLink } from "lucide-react";
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
import { AdminNav } from "@/app/admin/_nav";
import { ThemeToggle } from "@/components/theme-toggle";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const abbr = initials(profile.full_name) || "A";

  return (
    <div className="flex min-h-svh bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r bg-card shrink-0">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 px-4 border-b">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
            <GraduationCap className="size-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Zuu Academy</div>
            <div className="text-xs text-muted-foreground">Админ хэсэг</div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>

        {/* Bottom user */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <Avatar className="size-7 ring-2 ring-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-semibold">
                {abbr}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{profile.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur-sm px-4 sm:px-6">
          {/* Mobile brand */}
          <Link href="/admin" className="flex items-center gap-2 md:hidden">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <GraduationCap className="size-3.5 text-white" />
            </div>
            <span className="text-sm font-bold">Админ</span>
          </Link>

          {/* Mobile nav — horizontal scroll */}
          <div className="md:hidden flex-1 overflow-x-auto mx-3">
            <AdminNav />
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                  <Avatar className="size-7 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-semibold">
                      {abbr}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{profile.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="text-xs text-muted-foreground font-normal truncate">
                    {user.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer flex items-center gap-2">
                    <ExternalLink className="size-4" />
                    Сурагчийн самбар
                  </Link>
                </DropdownMenuItem>
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
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
