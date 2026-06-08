/**
 * 일일 변환 횟수 제한 (CLAUDE.md 수익화 티어 — Free: 일 15회 미들웨어 제한).
 *
 * 프레임워크 비의존 순수 로직 + 인메모리 카운터 폴백.
 * 프로덕션에서는 동일 인터페이스로 Redis(슬라이딩 윈도우)를 끼워 넣는다.
 */

export const FREE_DAILY_LIMIT = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RateDecision {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** 카운터 리셋(ms epoch) */
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** 인메모리 일일 카운터. globalThis 캐싱으로 HMR/요청 간 상태 유지. */
const g = globalThis as unknown as { __unlRateBuckets?: Map<string, Bucket> };
function buckets(): Map<string, Bucket> {
  if (!g.__unlRateBuckets) g.__unlRateBuckets = new Map();
  return g.__unlRateBuckets;
}

/**
 * 식별자(key)의 호출을 1회 차감하며 허용 여부를 판정한다.
 * limit 이하이면 allowed=true, 초과하면 false(카운트는 증가시키지 않음).
 */
export function consume(
  key: string,
  nowMs: number = Date.now(),
  limit: number = FREE_DAILY_LIMIT,
): RateDecision {
  const map = buckets();
  let b = map.get(key);
  if (!b || nowMs >= b.resetAt) {
    b = { count: 0, resetAt: nowMs + DAY_MS };
    map.set(key, b);
  }

  if (b.count >= limit) {
    return { allowed: false, remaining: 0, limit, resetAt: b.resetAt };
  }

  b.count += 1;
  return {
    allowed: true,
    remaining: limit - b.count,
    limit,
    resetAt: b.resetAt,
  };
}

/** 테스트용 — 카운터 전체 초기화 */
export function __resetRateLimit(): void {
  buckets().clear();
}
