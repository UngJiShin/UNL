/**
 * 야간 SM-2 + 오디오 사전 생성 배치 워커 (CLAUDE.md 개발 순서 #6, 3장).
 *
 * 역할:
 *   1. 내일 복습 예정 카드 중 오디오가 아직 없는 카드를 모은다.
 *   2. Gemini Batch API 파이프라인(50% 단가)으로 오디오를 일괄 합성한다.
 *      → synthesize 가 캐시 우선이므로 중복 텍스트는 API 호출 0회.
 *   3. 합성 결과 URL 을 카드에 적재한다.
 *
 * 프로덕션에서는 이 함수를 BullMQ(Redis) 반복 작업으로 야간 스케줄링한다.
 * 본 구현은 프레임워크 비의존 순수 함수라 단위 테스트/크론/큐 어디서든 호출 가능.
 */

import { getCardStore, type CardStore } from "@/lib/store/cardStore";
import { synthesize } from "@/lib/tts/gemini";
import type { Tier } from "@/lib/cache/ttsCache";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface NightlyBatchOptions {
  /** 기준 시각(ms epoch). 기본값 Date.now(). */
  nowMs?: number;
  /** 선행 생성할 예정 구간(일). 기본 1일 = 내일까지. */
  horizonDays?: number;
  /** 배치 합성에 쓸 요금제(모델 선택). 기본 enterprise(배치 전용 파이프라인). */
  tier?: Tier;
  /** 주입 가능한 스토어(테스트용). 기본 전역 싱글톤. */
  store?: CardStore;
}

export interface NightlyBatchResult {
  /** 검사한 예정 카드 수 */
  scanned: number;
  /** 신규 합성(캐시 미스)한 카드 수 */
  synthesized: number;
  /** 캐시 히트로 API 호출을 절감한 카드 수 */
  cached: number;
  /** 합성에 실패한 카드 수 */
  failed: number;
}

/**
 * 내일까지 복습 예정인 카드의 오디오를 미리 합성해 적재한다.
 * 이미 audioUrl 이 있는 카드는 건너뛴다(멱등).
 */
export async function runNightlyBatch(
  opts: NightlyBatchOptions = {},
): Promise<NightlyBatchResult> {
  const now = opts.nowMs ?? Date.now();
  const horizon = now + (opts.horizonDays ?? 1) * DAY_MS;
  const tier = opts.tier ?? "enterprise";
  const store = opts.store ?? getCardStore();

  const upcoming = await store.listAllDueBefore(horizon);
  const pending = upcoming.filter((c) => !c.audioUrl);

  const result: NightlyBatchResult = {
    scanned: pending.length,
    synthesized: 0,
    cached: 0,
    failed: 0,
  };

  for (const card of pending) {
    try {
      const { url, cached } = await synthesize({
        text: card.plain,
        lang: card.language,
        tier,
        batch: true,
      });
      await store.update(card.id, { audioUrl: url });
      if (cached) result.cached += 1;
      else result.synthesized += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}
