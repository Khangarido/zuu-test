import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Zuu Academy — ЭЕШ Mock Test",
  description:
    "Zuu Academy — zuutest.site | Элсэлтийн ерөнхий шалгалтад бэлдэхэд зориулсан бодит орчин, сэдэвчилсэн дасгал, гүйцэтгэлийн дэлгэрэнгүй шинжилгээтэй платформ.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <div suppressHydrationWarning>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
            <Toaster richColors position="top-center" />
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
