import { describe, it, expect, beforeEach } from "vitest";
import { consume, __resetRateLimit, FREE_DAILY_LIMIT } from "./rateLimit";

describe("일일 변환 제한 (Free 15회)", () => {
  beforeEach(() => __resetRateLimit());

  it("한도 내에서는 remaining 이 감소하며 허용된다", () => {
    const first = consume("ip-1", 0);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(FREE_DAILY_LIMIT - 1);
  });

  it("한도 초과 시 차단한다", () => {
    for (let i = 0; i < FREE_DAILY_LIMIT; i++) consume("ip-2", 0);
    const over = consume("ip-2", 0);
    expect(over.allowed).toBe(false);
    expect(over.remaining).toBe(0);
  });

  it("24시간 경과 후 카운터가 리셋된다", () => {
    for (let i = 0; i < FREE_DAILY_LIMIT; i++) consume("ip-3", 0);
    expect(consume("ip-3", 0).allowed).toBe(false);
    const nextDay = 24 * 60 * 60 * 1000;
    expect(consume("ip-3", nextDay).allowed).toBe(true);
  });

  it("식별자별로 카운터가 분리된다", () => {
    for (let i = 0; i < FREE_DAILY_LIMIT; i++) consume("ip-4", 0);
    expect(consume("ip-4", 0).allowed).toBe(false);
    expect(consume("ip-5", 0).allowed).toBe(true);
  });
});
