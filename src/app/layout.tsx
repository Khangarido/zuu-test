import type { Metadata } from "next"
import { Inter, Baloo_2 } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "optional",
  preload: true,
})

const baloo2 = Baloo_2({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-baloo2",
  display: "optional",
  preload: false,
})

export const metadata: Metadata = {
  title: "Zuu Academy — ЭЕШ Mock Test",
  description:
    "Zuu Academy — zuutest.site | Элсэлтийн ерөнхий шалгалтад бэлдэхэд зориулсан бодит орчин, сэдэвчилсэн дасгал, гүйцэтгэлийн дэлгэрэнгүй шинжилгээтэй платформ.",
  icons: { icon: "/favicon.ico" },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn" className={`${inter.variable} ${baloo2.variable} h-full antialiased`} suppressHydrationWarning>
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
