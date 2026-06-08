import { describe, it, expect, beforeEach } from "vitest";
import { runNightlyBatch } from "./worker";
import type { CardStore } from "@/lib/store/cardStore";
import type { Card } from "@/types/card";
import { initialState } from "@/lib/srs/sm2";

/** 테스트용 인메모리 스토어 */
function makeStore(seed: Card[]): CardStore {
  const map = new Map(seed.map((c) => [c.id, c]));
  return {
    async create(c) {
      map.set(c.id, c);
      return c;
    },
    async get(id) {
      return map.get(id) ?? null;
    },
    async update(id, patch) {
      const existing = map.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...patch, id: existing.id };
      map.set(id, updated);
      return updated;
    },
    async listDue(userId, nowMs) {
      return [...map.values()].filter(
        (c) => c.userId === userId && c.nextReviewAt <= nowMs,
      );
    },
    async listByUser(userId) {
      return [...map.values()].filter((c) => c.userId === userId);
    },
    async listAllDueBefore(beforeMs) {
      return [...map.values()].filter((c) => c.nextReviewAt <= beforeMs);
    },
    async delete(id) {
      return map.delete(id);
    },
  };
}

function card(id: string, nextReviewAt: number, audioUrl?: string): Card {
  return {
    id,
    userId: "u1",
    originalText: `word-${id}`,
    language: "en",
    mode: "web-safe",
    rubyHtml: `<ruby>word-${id}</ruby>`,
    plain: `표음-${id}`, // 카드별 고유 텍스트 → 캐시 키 분리
    audioUrl,
    srs: initialState(),
    nextReviewAt,
    createdAt: 0,
  };
}

describe("runNightlyBatch", () => {
  const now = 1_000_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY; // mock URL 경로 강제
  });

  it("내일까지 예정 + 오디오 없는 카드만 합성한다", async () => {
    const store = makeStore([
      card("a", now), // 오늘 예정 → 대상
      card("b", now + DAY / 2), // 내일 안 → 대상
      card("c", now + 3 * DAY), // 지평선 밖 → 제외
      card("d", now, "https://cdn/x.mp3"), // 이미 오디오 → 제외
    ]);

    const res = await runNightlyBatch({ nowMs: now, store });

    expect(res.scanned).toBe(2);
    expect(res.synthesized).toBe(2);
    expect(res.failed).toBe(0);
    expect((await store.get("a"))?.audioUrl).toMatch(/^https:\/\/mock\.cdn/);
    expect((await store.get("c"))?.audioUrl).toBeUndefined();
    expect((await store.get("d"))?.audioUrl).toBe("https://cdn/x.mp3");
  });

  it("멱등 — 재실행 시 이미 적재된 카드는 건너뛴다", async () => {
    const store = makeStore([card("a", now)]);
    await runNightlyBatch({ nowMs: now, store });
    const second = await runNightlyBatch({ nowMs: now, store });
    expect(second.scanned).toBe(0);
  });
});
