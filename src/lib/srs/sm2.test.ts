import { describe, it, expect } from "vitest";
import {
  initialState,
  nextEaseFactor,
  review,
  nextReviewAt,
  INITIAL_EF,
  MIN_EF,
} from "./sm2";

describe("nextEaseFactor", () => {
  it("q=5 이면 +0.10", () => {
    expect(nextEaseFactor(2.5, 5)).toBeCloseTo(2.6, 5);
  });
  it("q=4 이면 변동 없음", () => {
    expect(nextEaseFactor(2.5, 4)).toBeCloseTo(2.5, 5);
  });
  it("q=3 이면 -0.14", () => {
    expect(nextEaseFactor(2.5, 3)).toBeCloseTo(2.36, 5);
  });
  it("q=0 이면 -0.80", () => {
    expect(nextEaseFactor(2.5, 0)).toBeCloseTo(1.7, 5);
  });
  it("하한 1.3 가드", () => {
    expect(nextEaseFactor(1.3, 0)).toBe(MIN_EF);
  });
});

describe("review — 성공 경로", () => {
  it("첫 성공 인터벌은 1일", () => {
    const s = review(initialState(), 5);
    expect(s.n).toBe(1);
    expect(s.interval).toBe(1);
  });
  it("두 번째 성공 인터벌은 6일", () => {
    let s = review(initialState(), 5);
    s = review(s, 5);
    expect(s.n).toBe(2);
    expect(s.interval).toBe(6);
  });
  it("세 번째 성공은 round(이전 인터벌 × EF)", () => {
    let s = review(initialState(), 4); // n1, I=1, EF=2.5
    s = review(s, 4); // n2, I=6, EF=2.5
    s = review(s, 4); // n3, I=round(6×2.5)=15
    expect(s.n).toBe(3);
    expect(s.interval).toBe(15);
  });
});

describe("review — 실패 경로", () => {
  it("q<3 이면 n=0, interval=1 로 리셋", () => {
    let s = review(initialState(), 5);
    s = review(s, 5); // n=2, I=6
    const failed = review(s, 1);
    expect(failed.n).toBe(0);
    expect(failed.interval).toBe(1);
  });
  it("실패해도 EF 는 승계(갱신)된다", () => {
    let s = review(initialState(), 5); // EF=2.6
    const failed = review(s, 2); // EF -= 0.32
    expect(failed.ef).toBeCloseTo(2.28, 5);
  });
});

describe("입력 검증", () => {
  it("범위를 벗어난 q는 예외", () => {
    expect(() => review(initialState(), 6)).toThrow(RangeError);
    expect(() => review(initialState(), -1)).toThrow(RangeError);
  });
});

describe("nextReviewAt", () => {
  it("인터벌(일)만큼 미래 시각을 산출", () => {
    const base = 1_000_000_000_000;
    const s = { n: 2, ef: 2.5, interval: 6 };
    expect(nextReviewAt(s, base)).toBe(base + 6 * 86_400_000);
  });
});

describe("initialState", () => {
  it("EF 시작값은 2.5", () => {
    expect(initialState().ef).toBe(INITIAL_EF);
  });
});
