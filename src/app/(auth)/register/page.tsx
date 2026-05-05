"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

const registerSchema = z.object({
  full_name: z.string().min(2, "Бүтэн нэрээ оруулна уу").max(100),
  email: z.string().email("Зөв имэйл хаяг оруулна уу"),
  password: z
    .string()
    .min(8, "Нууц үг хамгийн багадаа 8 тэмдэгтээс бүрдэнэ"),
  phone: z.string().optional(),
  school: z.string().min(2, "Сургуулийн нэрээ оруулна уу").max(120),
  grade: z.enum(["10", "11", "12", "graduated"], {
    message: "Ангиа сонгоно уу",
  }),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      phone: "",
      school: "",
      grade: "12",
    },
  });

  async function onSubmit(values: RegisterValues) {
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.full_name,
          phone: values.phone || null,
          school: values.school,
          grade: values.grade,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setSubmitting(false);

    if (error) {
      toast.error("Бүртгэл амжилтгүй", { description: error.message });
      return;
    }

    toast.success("Имэйл рүү тань баталгаажуулах код илгээлээ");
    router.push(`/verify?email=${encodeURIComponent(values.email)}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Бүртгэл үүсгэх</CardTitle>
        <CardDescription>
          Zuu Academy — ЭЕШ mock шалгалтуудад нэвтрэхийн тулд бүртгүүлнэ үү.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Бүтэн нэр</FormLabel>
                  <FormControl>
                    <Input placeholder="Дорж Болд" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имэйл</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="dorj@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Нууц үг</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Утасны дугаар{" "}
                    <span className="text-muted-foreground font-normal">
                      (заавал биш)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="99112233"
                      autoComplete="tel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="school"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Сургууль</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Шинэ эхлэл сургууль"
                      autoComplete="organization"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Анги</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="10">10-р анги</option>
                      <option value="11">11-р анги</option>
                      <option value="12">12-р анги</option>
                      <option value="graduated">Төгссөн</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-3 mt-6">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
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
