import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ArrowRight, BarChart3, GraduationCap, Target } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <GraduationCap className="size-5" />
            Zuu Academy
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Нэвтрэх
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Бүртгүүлэх</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance">
            ЭЕШ-д бэлдэх <br className="hidden sm:block" />
            <span className="text-muted-foreground">
              хамгийн ухаалаг арга
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-balance">
            Бодит шалгалтын орчинд хугацаатай мок шалгалт өгч, өөрийн сул талаа
            тодорхойлоорой.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Үнэгүй бүртгүүлэх
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Нэвтрэх
              </Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-24 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Target className="size-6 mb-2" />
              <CardTitle>Бодит шалгалтын орчин</CardTitle>
              <CardDescription>
                Хугацаатай, нэг удаа өгөх боломжтой жинхэнэ ЭЕШ-ийн загвартай
                шалгалтууд.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <BarChart3 className="size-6 mb-2" />
              <CardTitle>Дэлгэрэнгүй шинжилгээ</CardTitle>
              <CardDescription>
                Шалгалтын дараа гүйцэтгэлийн тайлан, сэдэв тус бүрийн оноо,
                дутагдалтай хэсгийг харуулна.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <GraduationCap className="size-6 mb-2" />
              <CardTitle>Сэдэв тус бүрээр</CardTitle>
              <CardDescription>
                Математик, англи хэл, монгол хэл, нийгэм гэх мэт хичээл бүрийн
                цэвэр шалгалтууд.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Veritas Tech. Бүх эрх хуулиар хамгаалагдсан.
      </footer>
    </div>
  )
}
