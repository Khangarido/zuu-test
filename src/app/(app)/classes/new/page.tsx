"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, Camera, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const schema = z.object({
  name:        z.string().min(3, "Нэр хамгийн багадаа 3 тэмдэгт").max(80),
  description: z.string().max(300).optional(),
})
type FormValues = z.infer<typeof schema>

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9а-яөүё\s]/gi, "").trim()
    .replace(/\s+/g, "-").replace(/[а-яөүё]/gi, (c) => {
      const map: Record<string,string> = {
        а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"j",з:"z",и:"i",й:"y",
        к:"k",л:"l",м:"m",н:"n",о:"o",ө:"o",п:"p",р:"r",с:"s",т:"t",у:"u",
        ү:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",
        э:"e",ю:"yu",я:"ya",
      }
      return map[c.toLowerCase()] ?? c
    }).replace(/-+/g, "-").slice(0, 50)
}

export default function NewClassPage() {
  const router    = useRouter()
  const [busy, setBusy]         = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  })

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("Зураг 5MB-аас бага байх ёстой"); return }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function onSubmit(values: FormValues) {
    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }

    const slug = toSlug(values.name) || `class-${Date.now()}`

    let coverUrl: string | null = null
    if (coverFile) {
      const ext  = coverFile.name.split(".").pop()
      const path = `classes/${slug}.${ext}`
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, coverFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
        coverUrl = urlData.publicUrl
      }
    }

    const { data: cls, error } = await supabase
      .from("classes")
      .insert({
        name: values.name,
        slug,
        description: values.description || null,
        cover_url:   coverUrl,
        teacher_id:  user.id,
        is_public:   true,
      })
      .select("id, slug")
      .single()

    if (error) {
      toast.error("Анги үүсгэхэд алдаа гарлаа", { description: error.message })
      setBusy(false)
      return
    }

    // Add teacher as member
    await supabase.from("class_members").insert({
      class_id: cls.id,
      user_id:  user.id,
      role:     "teacher",
    })

    toast.success("Анги амжилттай үүслээ!")
    router.push(`/classes/${cls.slug}`)
  }

  const nameVal = form.watch("name")
  const slugPreview = toSlug(nameVal)

  return (
    <div className="min-h-svh bg-background flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Шинэ анги үүсгэх</h1>
          <p className="text-sm text-muted-foreground mt-1">Суралцагчдаа нэгтгэх нийгэмлэгийн анги</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ангийн мэдээлэл</CardTitle>
            <CardDescription>Нэр болон тайлбараа оруулна уу</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-5">
                {/* Cover image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Нүүр зураг (сонголттой)</label>
                  <div className="relative h-32 rounded-xl border-2 border-dashed border-input bg-muted overflow-hidden cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileRef.current?.click()}>
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                        <Camera className="size-6" />
                        <span className="text-xs">Зураг нэмэх</span>
                      </div>
                    )}
                  </div>
                  {coverPreview && (
                    <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null) }}
                      className="text-xs text-destructive flex items-center gap-1">
                      <X className="size-3" /> Зураг устгах
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
                </div>

                {/* Name */}
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ангийн нэр</FormLabel>
                    <FormControl>
                      <Input placeholder="Математикийн ЭЕШ бэлтгэл" {...field} />
                    </FormControl>
                    {slugPreview && (
                      <p className="text-xs text-muted-foreground">Холбоос: /classes/{slugPreview}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Description */}
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тайлбар (сонголттой)</FormLabel>
                    <FormControl>
                      <textarea {...field} rows={3} maxLength={300} placeholder="Ангийн тухай товч тайлбар..."
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>

              <CardFooter className="mt-2">
                <Button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin mr-2" />}
                  Анги үүсгэх
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  )
}
