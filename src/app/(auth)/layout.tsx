import Link from "next/link";
import { GraduationCap, BookOpen, BarChart2, Clock } from "lucide-react";

const features = [
  { icon: BookOpen, text: "Бодит шалгалтын орчин, таймертай" },
  { icon: BarChart2, text: "Сэдэвчилсэн нарийвчилсан шинжилгээ" },
  { icon: Clock, text: "Хугацаа болгонд дасгалаа давтаарай" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-800 text-white relative overflow-hidden">
        {/* Subtle background circles */}
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-white/5" />

        <Link href="/" className="flex items-center gap-3 relative z-10">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <GraduationCap className="size-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Zuu Academy</span>
        </Link>

        <div className="space-y-10 relative z-10">
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              ЭЕШ-д амжилттай<br />тэнцэхэд бэлд
            </h2>
            <p className="mt-3 text-indigo-100 text-sm leading-relaxed">
              Монголын сурагчдад зориулсан хамгийн дэвшилтэт
              шалгалтын бэлтгэл платформ.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="size-4 text-white" />
                </div>
                <span className="text-sm text-indigo-100">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-indigo-300 relative z-10">
          © {new Date().getFullYear()} Veritas Tech. Бүх эрх хуулиар хамгаалагдсан.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 bg-background">
        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <GraduationCap className="size-4 text-white" />
          </div>
          <span className="font-bold text-lg">Zuu Academy</span>
        </Link>

        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
