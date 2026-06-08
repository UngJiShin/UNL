import { describe, it, expect } from "vitest";
import { composeSyllable } from "./compose";

describe("composeSyllable", () => {
  it("초성+중성 음절 합성", () => {
    expect(composeSyllable("ㄱ", "ㅏ")).toBe("가");
    expect(composeSyllable("ㅎ", "ㅏ")).toBe("하");
  });

  it("초성+중성+종성 음절 합성", () => {
    expect(composeSyllable("ㅎ", "ㅏ", "ㄴ")).toBe("한");
    expect(composeSyllable("ㄱ", "ㅡ", "ㄹ")).toBe("글");
    expect(composeSyllable("ㅍ", "ㅔ", "ㄴ")).toBe("펜");
  });

  it("받침 없음(index 0)", () => {
    expect(composeSyllable("ㄹ", "ㅓ", "")).toBe("러");
  });

  it("잘못된 자모는 합성하지 않고 이어붙인다", () => {
    expect(composeSyllable("X", "ㅏ")).toBe("Xㅏ");
  });
});
