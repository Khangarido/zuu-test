"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, BookOpen, ClipboardList, HelpCircle,
  Users, CreditCard, ShieldAlert, BarChart2, School, Key, Timer,
} from "lucide-react"

const navItems = [
  { href: "/admin", label: "Самбар", icon: LayoutDashboard, exact: true },
  { href: "/admin/subjects", label: "Хичээл & Сэдэв", icon: BookOpen },
  { href: "/admin/exam-sets", label: "Шалгалт", icon: ClipboardList },
  { href: "/admin/questions", label: "Асуулт", icon: HelpCircle },
  { href: "/admin/results", label: "Дүнгийн тайлан", icon: BarChart2 },
  { href: "/admin/students", label: "Сурагчид", icon: Users },
  { href: "/admin/classes", label: "Ангиуд", icon: School },
  { href: "/admin/permissions", label: "Эрхүүд", icon: Key },
  { href: "/admin/timers", label: "Таймер", icon: Timer },
  { href: "/admin/payments", label: "Төлбөр", icon: CreditCard },
]

export function AdminNav({ role }: { role?: string }) {
  const pathname = usePathname()
  const allItems = [
    ...navItems,
    ...(role === "superadmin"
      ? [{ href: "/admin/dashboard", label: "Superadmin", icon: ShieldAlert, exact: false }]
      : []),
  ]
  return (
    <nav className="p-3 space-y-0.5">
      {allItems.map((item) => {
        const Icon = item.icon
        const isActive = (item as { exact?: boolean }).exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link key={item.href} href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
