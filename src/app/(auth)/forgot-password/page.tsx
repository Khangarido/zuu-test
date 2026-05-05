"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";

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

const forgotPasswordSchema = z.object({
  email: z.string().email("Зөв имэйл хаяг оруулна уу"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    setSubmitting(false);

    if (error) {
      toast.error("Алдаа гарлаа", { description: error.message });
      return;
    }

    setSent(true);
    toast.success("Нууц үг сэргээх имэйл илгээлээ");
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Имэйл илгээлээ</CardTitle>
          <CardDescription>
            {form.getValues("email")} хаяг руу нууц үг сэргээх холбоос илгээсэн.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Имэйлээ шалгаж, холбоос дээр дарна уу. Холбоос 1 цагийн дотор хүчинтэй.
        </CardContent>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Нэвтрэх рүү буцах
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Нууц үг сэргээх</CardTitle>
        <CardDescription>
          Бүртгэлтэй имэйл хаягаа оруулна уу. Нууц үг сэргээх холбоос
          илгээх болно.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
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
          </CardContent>
          <CardFooter className="flex flex-col gap-3 mt-6">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Холбоос илгээх
            </Button>
            <Link href="/login" className="w-full">
              <Button variant="outline" className="w-full" type="button">
                Буцах
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
