import { env } from "@/lib/env";

export async function GET() {
  return Response.json({ ok: true, domain: env.APP_DOMAIN });
}
