"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Camera, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const AIMAGS = [
  "Улаанбаатар",
  "Архангай",
  "Баян-Өлгий",
  "Баянхонгор",
  "Булган",
  "Говь-Алтай",
  "Говьсүмбэр",
  "Дархан-Уул",
  "Дорноговь",
  "Дорнод",
  "Дундговь",
  "Завхан",
  "Орхон",
  "Өвөрхангай",
  "Өмнөговь",
  "Сүхбаатар",
  "Сэлэнгэ",
  "Төв",
  "Увс",
  "Ховд",
  "Хөвсгөл",
  "Хэнтий",
];

const SELECT_CLS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const registerSchema = z.object({
  last_name:      z.string().min(1, "Овгоо оруулна уу").max(50),
  first_name:     z.string().min(1, "Нэрээ оруулна уу").max(50),
  sex:            z.enum(["male", "female"], { message: "Хүйсээ сонгоно уу" }),
  age:            z.coerce.number().min(10, "Нас 10-аас дээш байна").max(100, "Нас 100-аас бага байна"),
  aimag:          z.string().min(1, "Аймаг/хот сонгоно уу"),
  sum_district:   z.string().min(1, "Сум/дүүргээ оруулна уу").max(100),
  phone:          z.string().min(8, "Утасны дугаар оруулна уу").max(20),
  email:          z.string().email("Зөв имэйл хаяг оруулна уу"),
  password:       z.string().min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт"),
  school:         z.string().min(2, "Сургуулийн нэрээ оруулна уу").max(120),
  grade:          z.enum(["10", "11", "12", "graduated"], { message: "Ангиа сонгоно уу" }),
  receive_emails: z.boolean().default(false),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile]     = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      last_name: "", first_name: "", sex: "male", age: undefined as unknown as number,
      aimag: "", sum_district: "", phone: "", email: "",
      password: "", school: "", grade: "12", receive_emails: false,
    },
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Зураг 5MB-аас бага байх ёстой"); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function onSubmit(values: RegisterValues) {
    setSubmitting(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name:      `${values.last_name} ${values.first_name}`,
          first_name:     values.first_name,
          last_name:      values.last_name,
          sex:            values.sex,
          age:            values.age,
          aimag:          values.aimag,
          sum_district:   values.sum_district,
          phone:          values.phone,
          school:         values.school,
          grade:          values.grade,
          receive_emails: values.receive_emails,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setSubmitting(false);
      toast.error("Бүртгэл амжилтгүй", { description: error.message });
      return;
    }

    if (avatarFile && data.user) {
      const ext  = avatarFile.name.split(".").pop();
      const path = `${data.user.id}.${ext}`;
      await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
    }

    setSubmitting(false);
    toast.success("Имэйл рүү тань баталгаажуулах код илгээлээ");
    router.push(`/verify?email=${encodeURIComponent(values.email)}`);
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Бүртгэл үүсгэх</CardTitle>
        <CardDescription>
          Zuu Academy — ЭЕШ mock шалгалтуудад нэвтрэхийн тулд бүртгүүлнэ үү.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-5">

            {/* ── Avatar ── */}
            <div className="flex justify-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="size-20 rounded-full border-2 border-dashed border-input bg-muted flex items-center justify-center overflow-hidden hover:border-primary transition-colors"
                >
                  {avatarPreview
                    ? <img src={avatarPreview} alt="avatar" className="size-full object-cover" />
                    : <Camera className="size-7 text-muted-foreground" />}
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={() => { setAvatarFile(null); setAvatarPreview(null); }}
                    className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-white flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
            </div>

            {/* ── Divider ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Хувийн мэдээлэл</p>

            {/* Last + First name */}
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

            {/* Sex + Age */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Хүйс</FormLabel>
                  <FormControl>
                    <select {...field} className={SELECT_CLS}>
                      <option value="male">Эрэгтэй</option>
                      <option value="female">Эмэгтэй</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>Нас</FormLabel>
                  <FormControl><Input type="number" placeholder="17" min={10} max={100} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Aimag + Sum/District */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="aimag" render={({ field }) => (
                <FormItem>
                  <FormLabel>Аймаг / Хот</FormLabel>
                  <FormControl>
                    <select {...field} className={SELECT_CLS}>
                      <option value="">Сонгох...</option>
                      {AIMAGS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="sum_district" render={({ field }) => (
                <FormItem>
                  <FormLabel>Сум / Дүүрэг</FormLabel>
                  <FormControl><Input placeholder="Баянзүрх" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* ── Divider ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Холбоо барих</p>

            {/* Phone + Email */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Утас</FormLabel>
                  <FormControl><Input type="tel" placeholder="99112233" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Имэйл</FormLabel>
                  <FormControl><Input type="email" placeholder="dorj@gmail.com" autoComplete="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Нууц үг</FormLabel>
                <FormControl><Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* ── Divider ── */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Боловсрол</p>

            {/* School + Grade */}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="school" render={({ field }) => (
                <FormItem>
                  <FormLabel>Сургууль</FormLabel>
                  <FormControl><Input placeholder="Шинэ эхлэл" autoComplete="organization" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="grade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Анги</FormLabel>
                  <FormControl>
                    <select {...field} className={SELECT_CLS}>
                      <option value="10">10-р анги</option>
                      <option value="11">11-р анги</option>
                      <option value="12">12-р анги</option>
                      <option value="graduated">Төгссөн</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* ── Receive emails checkbox ── */}
            <FormField control={form.control} name="receive_emails" render={({ field }) => (
              <FormItem>
                <label className="flex items-start gap-3 cursor-pointer">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mt-0.5 size-4 rounded border-input accent-primary"
                    />
                  </FormControl>
                  <span className="text-sm text-muted-foreground leading-snug">
                    Шинэ шалгалт, онцгой санал болон шинэчлэлтийн мэдэгдэл имэйлээр авах
                  </span>
                </label>
              </FormItem>
            )} />

          </CardContent>

          <CardFooter className="flex flex-col gap-3 mt-2">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
              Бүртгүүлэх
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
  );
}
