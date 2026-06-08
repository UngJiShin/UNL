import { synthesize } from "@/lib/tts/gemini";
import type { Tier } from "@/lib/cache/ttsCache";

export const dynamic = "force-dynamic";

/** POST /api/tts — 텍스트 → 음성 URL (캐시 우선) */
export async function POST(req: Request) {
  let body: { text?: string; lang?: string; tier?: Tier };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "유효하지 않은 JSON" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return Response.json({ error: "text 가 비어 있습니다" }, { status: 400 });
  }

  try {
    const result = await synthesize({
      text,
      lang: body.lang ?? "en",
      tier: body.tier ?? "free",
    });
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "합성 실패" },
      { status: 500 },
    );
  }
}
