"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Camera, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const GRADES = [
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}-р анги` })),
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

const schema = z.object({
  first_name: z.string().min(1, "Нэрээ оруулна уу").max(50),
  last_name:  z.string().min(1, "Овгоо оруулна уу").max(50),
  grade:      z.string().min(1, "Ангиа сонгоно уу"),
})
type FormValues = z.infer<typeof schema>

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")
}

export default function ProfileEditPage() {
  const router  = useRouter()
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)
  const [existingAvatar, setExistingAvatar] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: "", last_name: "", grade: "" },
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/login"); return }
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, grade, subjects, avatar_url, username")
        .eq("id", user.id)
        .maybeSingle()
      if (profile) {
        form.reset({
          first_name: profile.first_name ?? "",
          last_name:  profile.last_name  ?? "",
          grade:      profile.grade      ?? "",
        })
        setSubjects((profile.subjects as string[] | null) ?? [])
        setExistingAvatar(profile.avatar_url ?? null)
        setUsername(profile.username ?? null)
      }
      setLoading(false)
    })
  }, [router, form])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("Зураг 5MB-аас бага байх ёстой"); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function toggleSubject(s: string) {
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }
  function toggleAll() {
    setSubjects((prev) => prev.length === SUBJECTS.length ? [] : [...SUBJECTS])
  }

  async function onSubmit(values: FormValues) {
    if (subjects.length === 0) { toast.error("Хамгийн багадаа нэг хичээл сонгоно уу"); return }
    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }

    let avatarUrl = existingAvatar
    if (avatarFile) {
      const ext  = avatarFile.name.split(".").pop()
      const path = `${user.id}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from("avatars").upload(path, avatarFile, { upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
        avatarUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: values.first_name,
        last_name:  values.last_name,
        full_name:  `${values.last_name} ${values.first_name}`,
        grade:      values.grade,
        subjects,
        ...(avatarUrl !== existingAvatar ? { avatar_url: avatarUrl } : {}),
      })
      .eq("id", user.id)

    setBusy(false)
    if (error) { toast.error("Алдаа гарлаа", { description: error.message }); return }
    toast.success("Профайл шинэчлэгдлээ")
    if (username) router.push(`/profile/${username}`)
    else router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const displayName = `${form.getValues("last_name")} ${form.getValues("first_name")}`.trim()
  const avatarSrc = avatarPreview ?? existingAvatar ?? undefined

  return (
    <div className="min-h-svh bg-background flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Профайл засах</h1>
          {username && (
            <p className="text-sm text-muted-foreground">
              @{username} — хэрэглэгчийн нэрийг өөрчлөх боломжгүй
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Хувийн мэдээлэл</CardTitle>
            <CardDescription>Нэр болон профайл зургаа шинэчилнэ үү</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="grid gap-5">
                {/* Avatar */}
                <div className="flex justify-center">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="size-20 rounded-full border-2 border-dashed border-input bg-muted flex items-center justify-center overflow-hidden hover:border-primary transition-colors"
                    >
                      {avatarSrc ? (
                        <Avatar className="size-full rounded-full">
                          <AvatarImage src={avatarSrc} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xl font-bold">
                            {initials(displayName) || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Camera className="size-7 text-muted-foreground" />
                      )}
                    </button>
                    {(avatarPreview || existingAvatar) && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null)
                          setAvatarPreview(null)
                          setExistingAvatar(null)
                        }}
                        className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-white flex items-center justify-center"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </div>
                </div>

                {/* Names */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="last_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Овог</FormLabel>
                      <FormControl><Input placeholder="Болд" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="first_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Нэр</FormLabel>
                      <FormControl><Input placeholder="Дорж" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Grade */}
                <FormField control={form.control} name="grade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Анги</FormLabel>
                    <FormControl>
                      <select {...field} className={SELECT_CLS}>
                        <option value="">Сонгох...</option>
                        {GRADES.map((g) => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Subjects */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Хичээлүүд</label>
                  <label className="flex items-center gap-2 cursor-pointer pb-1 border-b">
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
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
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
                </div>
              </CardContent>
              <CardFooter className="mt-2">
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin mr-2" />}
                  Хадгалах
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  )
}
