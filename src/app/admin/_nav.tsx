"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  HelpCircle,
  Users,
  CreditCard,
  ShieldAlert,
  BarChart2,
} from "lucide-react"

const navItems = [
  { href: "/admin", label: "\u0421\u0430\u043c\u0431\u0430\u0440", icon: LayoutDashboard, exact: true },
  { href: "/admin/subjects", label: "\u0425\u0438\u0447\u044d\u044d\u043b & \u0421\u044d\u0434\u044d\u0432", icon: BookOpen },
  { href: "/admin/exam-sets", label: "\u0428\u0430\u043b\u0433\u0430\u043b\u0442", icon: ClipboardList },
  { href: "/admin/questions", label: "\u0410\u0441\u0443\u0443\u043b\u0442", icon: HelpCircle },
  { href: "/admin/results", label: "\u0414\u04af\u043d\u0433\u0438\u0439\u043d \u0442\u0430\u0439\u043b\u0430\u043d", icon: BarChart2 },
  { href: "/admin/students", label: "\u0421\u0443\u0440\u0430\u0433\u0447\u0438\u0434", icon: Users },
  { href: "/admin/payments", label: "\u0422\u04e9\u043b\u0431\u04e9\u0440", icon: CreditCard },
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
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
