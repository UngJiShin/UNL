import { getCardStore } from "@/lib/store/cardStore";

export const dynamic = "force-dynamic";

const DEFAULT_USER = "demo-user";

/** DELETE /api/cards/[id] — 카드 삭제 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const { id } = params;
  if (!id) {
    return Response.json({ error: "id 가 필요합니다" }, { status: 400 });
  }

  const store = getCardStore();
  const card = await store.get(id);
  if (!card) {
    return Response.json({ error: "카드를 찾을 수 없습니다" }, { status: 404 });
  }
  if (card.userId !== DEFAULT_USER) {
    return Response.json({ error: "권한 없음" }, { status: 403 });
  }

  await store.delete(id);
  return Response.json({ deleted: true, id });
}
