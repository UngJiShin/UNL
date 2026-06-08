import { buildCards } from "@/lib/cards/builder";
import { getCardStore } from "@/lib/store/cardStore";
import type { ConvertOptions } from "@/lib/phonetic";

export const dynamic = "force-dynamic";

const DEFAULT_USER = "demo-user";

/** POST /api/cards — 텍스트로부터 학습 카드 묶음 생성 */
export async function POST(req: Request) {
  let body: {
    text?: string;
    userId?: string;
    meaning?: string;
    mode?: ConvertOptions["mode"];
    language?: ConvertOptions["language"];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "유효하지 않은 JSON" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return Response.json({ error: "text 가 비어 있습니다" }, { status: 400 });
  }

  const userId = body.userId ?? DEFAULT_USER;
  const cards = await buildCards({
    text,
    userId,
    meaning: body.meaning,
    mode: body.mode,
    language: body.language,
    nowMs: Date.now(),
  });

  const store = getCardStore();
  for (const c of cards) await store.create(c);
  return Response.json({ created: cards.length, cards }, { status: 201 });
}

/** GET /api/cards?userId=&due=true — 카드/복습 큐 조회 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") ?? DEFAULT_USER;
  const dueOnly = url.searchParams.get("due") === "true";
  const store = getCardStore();

  const cards = dueOnly
    ? await store.listDue(userId, Date.now())
    : await store.listByUser(userId);

  return Response.json({ count: cards.length, cards });
}
