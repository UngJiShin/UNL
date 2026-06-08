import { getCardStore } from "@/lib/store/cardStore";
import { review, nextReviewAt } from "@/lib/srs/sm2";

export const dynamic = "force-dynamic";

/** POST /api/review — 복습 결과(q) 반영, SM-2 상태 갱신 */
export async function POST(req: Request) {
  let body: { cardId?: string; q?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "유효하지 않은 JSON" }, { status: 400 });
  }

  const { cardId, q } = body;
  if (!cardId || typeof q !== "number") {
    return Response.json(
      { error: "cardId 와 숫자 q(0~5) 가 필요합니다" },
      { status: 400 },
    );
  }

  const store = getCardStore();
  const card = await store.get(cardId);
  if (!card) {
    return Response.json({ error: "카드를 찾을 수 없습니다" }, { status: 404 });
  }

  let nextSrs;
  try {
    nextSrs = review(card.srs, q);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "잘못된 q" },
      { status: 400 },
    );
  }

  const now = Date.now();
  const updated = await store.update(cardId, {
    srs: nextSrs,
    nextReviewAt: nextReviewAt(nextSrs, now),
  });

  return Response.json({
    id: cardId,
    srs: nextSrs,
    nextReviewAt: updated?.nextReviewAt,
    intervalDays: nextSrs.interval,
  });
}
