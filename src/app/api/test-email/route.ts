import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "zuu.academy@gmail.com",
    subject: "Zuu Academy — имэйл тест",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="margin-bottom:8px;">Имэйл ажиллаж байна ✓</h2>
        <p style="color:#555;">Resend холболт амжилттай боллоо.</p>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ data });
}
