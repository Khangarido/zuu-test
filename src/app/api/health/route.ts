export const runtime = "edge"

export function GET() {
  return new Response("ok", { status: 200 })
}
