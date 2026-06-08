/**
 * SuperMemo-2 (SM-2) 간격 반복 스케줄링 엔진 — 순수 함수.
 * CLAUDE.md 2.2 의 공식을 그대로 구현한다.
 *
 *   인터벌:
 *     I(1) = 1, I(2) = 6, I(n>2) = round(I(n-1) × EF)
 *   이지 팩터:
 *     EF' = max(1.3, EF + (0.1 - (5-q)(0.08 + (5-q)×0.02)))
 *   실패(q < 3):
 *     n → 0, 인터벌 → 1, EF 는 승계
 */

export const INITIAL_EF = 2.5;
export const MIN_EF = 1.3;
export const PASS_THRESHOLD = 3; // q >= 3 이면 회상 성공

/** 카드의 SM-2 학습 상태 */
export interface Sm2State {
  /** 연속 성공 반복 횟수 */
  n: number;
  /** 이지 팩터 */
  ef: number;
  /** 다음 복습까지 일수 */
  interval: number;
}

/** 신규 카드 초기 상태 */
export function initialState(): Sm2State {
  return { n: 0, ef: INITIAL_EF, interval: 0 };
}

/** 이지 팩터 갱신 공식 (하한 1.3) */
export function nextEaseFactor(ef: number, q: number): number {
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  return Math.max(MIN_EF, ef + delta);
}

/**
 * 자가 평가 점수 q(0~5)를 반영해 다음 SM-2 상태를 계산한다.
 * 부수효과 없음 — 새 상태 객체를 반환한다.
 */
export function review(state: Sm2State, q: number): Sm2State {
  if (q < 0 || q > 5) {
    throw new RangeError(`q는 0~5 범위여야 합니다: ${q}`);
  }

  const ef = nextEaseFactor(state.ef, q);

  // 실패 — 반복 리셋, EF 는 승계
  if (q < PASS_THRESHOLD) {
    return { n: 0, ef, interval: 1 };
  }

  // 성공 — 반복 증가 + 인터벌 확장
  const n = state.n + 1;
  let interval: number;
  if (n === 1) {
    interval = 1;
  } else if (n === 2) {
    interval = 6;
  } else {
    interval = Math.round(state.interval * ef);
  }
  return { n, ef, interval };
}

/** 복습 결과로부터 다음 복습 예정 시각(ms epoch)을 산출 */
export function nextReviewAt(state: Sm2State, fromMs: number): number {
  const DAY = 24 * 60 * 60 * 1000;
  return fromMs + state.interval * DAY;
}
