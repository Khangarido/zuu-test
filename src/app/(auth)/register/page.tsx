"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Loader2, Camera, X, CheckCircle2, XCircle, Eye, EyeOff,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { finaliseProfile } from "./_actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"

/* ── Constants ──────────────────────────────────────────────────────────── */

const GRADES = [
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}-р анги`,
  })),
  { value: "graduated", label: "Төгссөн" },
  { value: "other", label: "Бусад" },
]

const SUBJECTS = [
  "Математик", "Монгол хэл", "Англи хэл", "Физик",
  "Хими", "Биологи", "Газарзүй", "Түүх",
  "Нийгэм", "Мэдээлэл зүй", "Бусад",
]

const SELECT_CLS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/* ── Schemas ─────────────────────────────────────────────────────────────── */

const step1Schema = z.object({
  first_name: z.string().min(1, "Нэрээ оруулна уу").max(50),
  last_name:  z.string().min(1, "Овгоо оруулна уу").max(50),
  email:      z.string().email("Зөв имэйл оруулна уу"),
  password:   z.string().min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт"),
})

const step2Schema = z.object({
  username: z
    .string()
    .min(3, "Хэрэглэгчийн нэр хамгийн багадаа 3 тэмдэгт")
    .max(20, "Хэрэглэгчийн нэр хамгийн ихдээ 20 тэмдэгт")
    .regex(/^[a-z0-9]+$/, "Зөвхөн жижиг латин үсэг, тоо"),
})

const step3Schema = z.object({
  grade: z.string().min(1, "Ангиа сонгоно уу"),
})

type Step1 = z.infer<typeof step1Schema>
type Step2 = z.infer<typeof step2Schema>
type Step3 = z.infer<typeof step3Schema>

/* ── Component ──────────────────────────────────────────────────────────── */

export default function RegisterPage() {
  const router   = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [busy, setBusy] = useState(false)

  // Collected across steps
  const [s1Data, setS1Data] = useState<Step1 | null>(null)
  const [s2Data, setS2Data] = useState<Step2 | null>(null)

  // Avatar
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle")

  // Subjects
  const [subjects, setSubjects] = useState<string[]>([])
  const [isTeacher, setIsTeacher] = useState(false)

  // Step forms
  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: { first_name: "", last_name: "", email: "", password: "" },
  })
  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { username: "" },
  })
  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: { grade: "" },
  })

  const [showPw, setShowPw] = useState(false)

  /* ── Username debounced check ── */
  const checkUsername = useCallback(
    async (raw: string) => {
      const val = raw.toLowerCase().trim()
      if (!val) { setUsernameStatus("idle"); return }
      if (!/^[a-z0-9]{3,20}$/.test(val)) { setUsernameStatus("invalid"); return }
      setUsernameStatus("checking")
      try {
        const res = await fetch(`/api/check-username?username=${encodeURIComponent(val)}`)
        const json = await res.json()
        setUsernameStatus(json.available ? "available" : "taken")
      } catch {
        setUsernameStatus("idle")
      }
    },
    []
  )

  const usernameValue = form2.watch("username")
  useEffect(() => {
    const t = setTimeout(() => checkUsername(usernameValue), 400)
    return () => clearTimeout(t)
  }, [usernameValue, checkUsername])

  /* ── Avatar ── */
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Зураг 5MB-аас бага байх ёстой")
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  /* ── Subjects toggle ── */
  function toggleSubject(s: string) {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }
  function toggleAll() {
    setSubjects((prev) => (prev.length === SUBJECTS.length ? [] : [...SUBJECTS]))
  }

  /* ── Step handlers ── */
  function onStep1Next(values: Step1) {
    setS1Data(values)
    setStep(2)
  }

  function onStep2Next(values: Step2) {
    if (usernameStatus === "taken") {
      form2.setError("username", { message: "Хэрэглэгчийн нэр аль хэдийн бүртгэлтэй" })
      return
    }
    if (usernameStatus === "invalid") {
      form2.setError("username", { message: "Зөвхөн жижиг латин үсэг болон тоо" })
      return
    }
    setS2Data(values)
    setStep(3)
  }

  async function onStep3Submit(values: Step3) {
    if (!s1Data || !s2Data) return
    if (subjects.length === 0) {
      toast.error("Хамгийн багадаа нэг хичээл сонгоно уу")
      return
    }
    setBusy(true)
    try {
      const supabase = createClient()

      const checkRes = await fetch(`/api/check-username?username=${encodeURIComponent(s2Data.username)}`)
      const checkJson = await checkRes.json()
      if (!checkJson.available) {
        toast.error("Хэрэглэгчийн нэр аль хэдийн бүртгэлтэй байна. Өөр нэр сонгоно уу.")
        setBusy(false)
        setStep(2)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email:    s1Data.email,
        password: s1Data.password,
        options: {
          data: {
            full_name:  `${s1Data.last_name} ${s1Data.first_name}`,
            first_name: s1Data.first_name,
            last_name:  s1Data.last_name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error || !data.user) {
        toast.error("Бүртгэл амжилтгүй", { description: error?.message })
        setBusy(false)
        return
      }

      const userId = data.user.id
      let avatarUrl: string | null = null

      if (avatarFile) {
        const ext  = avatarFile.name.split(".").pop()
        const path = `${userId}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(path)
          avatarUrl = urlData.publicUrl
        }
      }

      await finaliseProfile(userId, avatarUrl, s2Data.username, values.grade, subjects, s1Data.first_name, s1Data.last_name, isTeacher)

      setBusy(false)
      if (data.session) {
        toast.success("Бүртгэл амжилттай! Тавтай морил.")
        router.push("/dashboard")
        router.refresh()
      } else {
        toast.success("Имэйл рүү баталгаажуулах код илгээлээ")
        router.push(`/verify?email=${encodeURIComponent(s1Data.email)}`)
      }
    } catch (err) {
      setBusy(false)
      toast.error("Бүртгэл амжилтгүй", { description: err instanceof Error ? err.message : "Дахин оролдоно уу" })
    }
  }

  /* ── Progress indicator ── */
  const steps = ["Бүртгэл", "Профайл", "Мэдээлэл"]

  return (
    <div className="w-full max-w-md">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((label, idx) => {
          const num = idx + 1
          const active = step === num
          const done   = step > num
          return (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={[
                    "size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    done   ? "bg-primary text-primary-foreground"
                    : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                             : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {done ? "✓" : num}
                </div>
                <span
                  className={[
                    "text-xs font-medium hidden sm:block",
                    active ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={[
                    "h-px w-8 sm:w-12 transition-colors",
                    step > num ? "bg-primary" : "bg-border",
                  ].join(" ")}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Account ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Бүртгэл үүсгэх</CardTitle>
            <CardDescription>
              Zuu Academy — ЭЕШ mock шалгалтуудад нэвтрэх
            </CardDescription>
          </CardHeader>
          <Form {...form1}>
            <form onSubmit={form1.handleSubmit(onStep1Next)}>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form1.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Овог</FormLabel>
                        <FormControl>
                          <Input placeholder="Болд" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form1.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Нэр</FormLabel>
                        <FormControl>
                          <Input placeholder="Дорж" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form1.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Имэйл</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="dorj@gmail.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form1.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нууц үг</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPw ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="new-password"
                            className="pr-9"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw((p) => !p)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPw
                              ? <EyeOff className="size-4" />
                              : <Eye className="size-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex flex-col gap-3 mt-2">
                <Button type="submit" className="w-full">
                  Үргэлжлүүлэх
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Бүртгэлтэй юу?{" "}
                  <Link href="/login" className="font-medium text-foreground underline">
                    Нэвтрэх
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}

      {/* ── Step 2: Profile ──────────────────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Профайл тохируулах</CardTitle>
            <CardDescription>
              Хэрэглэгчийн нэр болон профайл зураг
            </CardDescription>
          </CardHeader>
          <Form {...form2}>
            <form onSubmit={form2.handleSubmit(onStep2Next)}>
              <CardContent className="grid gap-5">
                {/* Avatar */}
                <div className="flex justify-center">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="size-20 rounded-full border-2 border-dashed border-input bg-muted flex items-center justify-center overflow-hidden hover:border-primary transition-colors"
                    >
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="avatar"
                          className="size-full object-cover"
                        />
                      ) : (
                        <Camera className="size-7 text-muted-foreground" />
                      )}
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null)
                          setAvatarPreview(null)
                        }}
                        className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-white flex items-center justify-center"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground -mt-2">
                  Профайл зураг (заавал биш)
                </p>

                {/* Username */}
                <FormField
                  control={form2.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>@Хэрэглэгчийн нэр</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            @
                          </span>
                          <Input
                            className="pl-7 pr-8"
                            placeholder="dorj123"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e.target.value.toLowerCase())
                            }}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                            {usernameStatus === "checking" && (
                              <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            )}
                            {usernameStatus === "available" && (
                              <CheckCircle2 className="size-4 text-emerald-500" />
                            )}
                            {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                              <XCircle className="size-4 text-destructive" />
                            )}
                          </span>
                        </div>
                      </FormControl>
                      {usernameStatus === "available" && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Боломжтой нэр байна
                        </p>
                      )}
                      {usernameStatus === "taken" && (
                        <p className="text-xs text-destructive">
                          Энэ нэр аль хэдийн бүртгэлтэй
                        </p>
                      )}
                      {usernameStatus === "invalid" && (
                        <p className="text-xs text-destructive">
                          Зөвхөн жижиг латин үсэг болон тоо (3–20 тэмдэгт)
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Буцах
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={usernameStatus === "checking" || usernameStatus === "taken" || usernameStatus === "invalid"}
                >
                  Үргэлжлүүлэх
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}

      {/* ── Step 3: About you ────────────────────────────────────────────────── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Танилцуулга</CardTitle>
            <CardDescription>Анги болон хичээлүүдээ сонгоно уу</CardDescription>
          </CardHeader>
          <Form {...form3}>
            <form onSubmit={form3.handleSubmit(onStep3Submit)}>
              <CardContent className="grid gap-5">
                {/* Grade */}
                <FormField
                  control={form3.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Анги</FormLabel>
                      <FormControl>
                        <select {...field} className={SELECT_CLS}>
                          <option value="">Сонгох...</option>
                          {GRADES.map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Subjects */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Хичээлүүд
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pb-1 border-b mb-1">
                    <input
                      type="checkbox"
                      checked={subjects.length === SUBJECTS.length}
                      onChange={toggleAll}
                      className="size-4 rounded border-input accent-primary"
                    />
                    <span className="text-sm font-medium">Бүгдийг сонгох</span>
                  </label>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3">
                    {SUBJECTS.map((s) => (
                      <label
                        key={s}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={subjects.includes(s)}
                          onChange={() => toggleSubject(s)}
                          className="size-4 rounded border-input accent-primary"
                        />
                        <span className="text-sm">{s}</span>
                      </label>
                    ))}
                  </div>
                    {subjects.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Хамгийн багадаа нэг хичээл сонгоно уу
                    </p>
                  )}
                </div>

                {/* Teacher toggle */}
                <label className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer hover:bg-accent transition-colors">
                  <input
                    type="checkbox"
                    checked={isTeacher}
                    onChange={(e) => setIsTeacher(e.target.checked)}
                    className="size-4 rounded border-input accent-primary mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Би багш мөн</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                                    Багш болж анги үүсгэж, сурагчдаа удирдах боломжтой болно
                    </p>
                  </div>
                </label>
              </CardContent>
              <CardFooter className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(2)}
                  disabled={busy}
                >
                  Буцах
                </Button>
                <Button type="submit" className="flex-1" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin mr-2" />}
                  Бүртгүүлэх
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}
    </div>
  )
}
