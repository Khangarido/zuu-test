"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("6 оронтой код оруулна уу");
      return;
    }
    setVerifying(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setVerifying(false);

    if (error) {
      toast.error("Код буруу байна", { description: error.message });
      return;
    }
    toast.success("Бүртгэл баталгаажлаа");
    router.push("/dashboard");
    router.refresh();
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setResending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResending(false);

    if (error) {
      toast.error("Код илгээж чадсангүй", { description: error.message });
      return;
    }
    toast.success("Шинэ кодыг имэйл рүү тань илгээлээ");
    setCooldown(60);
  }

  if (!email) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Имэйл олдсонгүй</CardTitle>
          <CardDescription>
            Бүртгэлээ эхнээс нь дахин эхлүүлнэ үү.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push("/register")} className="w-full">
            Бүртгүүлэх рүү буцах
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Имэйл хаягаа баталгаажуулна уу</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">{email}</span> хаяг руу
          явуулсан 6 оронтой кодыг доор оруулна уу.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleVerify}>
        <CardContent>
          <Input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em] font-mono h-14"
            autoFocus
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 mt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={verifying || code.length !== 6}
          >
            {verifying && <Loader2 className="size-4 animate-spin" />}
            Баталгаажуулах
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full"
          >
            {resending && <Loader2 className="size-4 animate-spin" />}
            {cooldown > 0
              ? `Дахин илгээх (${cooldown}с)`
              : "Дахин илгээх"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<Card><CardHeader><CardTitle>Уншиж байна...</CardTitle></CardHeader></Card>}>
      <VerifyForm />
    </Suspense>
  );
}
