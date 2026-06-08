import { describe, it, expect } from "vitest";
import { convert, detectLanguage } from "./index";
import { pinyinSyllableToHangul, parsePinyinSyllable } from "./chinese";

async function joined(text: string, mode: "web-safe" | "old-hangul" = "web-safe") {
  const result = await convert(text, { mode });
  return result.syllables.map((s) => s.hangul).join("");
}

describe("언어 감지", () => {
  it("영어 텍스트", () => {
    expect(detectLanguage("hello world")).toBe("en");
  });
  it("병음 성조표기는 중국어", () => {
    expect(detectLanguage("ni3 hao3")).toBe("zh");
  });
  it("한자는 중국어", () => {
    expect(detectLanguage("你好")).toBe("zh");
  });
});

describe("영어 → 한글 표음 (web-safe)", () => {
  it("pen 은 받침 ㄴ 음절로 합성된다", async () => {
    expect(await joined("pen")).toBe("펜");
  });
  it("run 은 ㄹ 초성 + ㄴ 받침", async () => {
    expect(await joined("run")).toBe("런");
  });
  it("best 는 자음군에 ㅡ 보강 (베스트 형태)", async () => {
    expect(await joined("best")).toBe("베스트");
  });
  it("f(fun) 는 p(pen) 와 구별된다 — 특허 회피 디지라프", async () => {
    const fun = await joined("fun");
    const pun = "펀"; // p + ㅓ + n
    expect(fun).not.toBe(pun);
    expect(fun.startsWith("ㅇ")).toBe(true); // web-safe f 접두 ㅇ
  });
});

describe("영어 → 한글 표음 (old-hangul)", () => {
  it("f 는 옛한글 순경음 자모(ᅗ)를 사용한다", async () => {
    const fun = await joined("fun", "old-hangul");
    expect(fun.includes("ᅗ")).toBe(true);
  });
});

describe("중국어 병음 파싱", () => {
  it("zh + ong + 성조1", () => {
    expect(parsePinyinSyllable("zhong1")).toEqual({
      initial: "zh",
      final: "ong",
      tone: 1,
    });
  });
  it("성조 숫자 없으면 경성(5)", () => {
    expect(parsePinyinSyllable("ma")?.tone).toBe(5);
  });
});

describe("중국어 → 한글 표음", () => {
  it("권설음 뒤 i 는 ㅡ 로 (shi → 스)", () => {
    expect(pinyinSyllableToHangul("shi4", "web-safe").hangul).toBe("스");
  });
  it("일반 자음 뒤 i 는 ㅣ 로 (ni → 니)", () => {
    expect(pinyinSyllableToHangul("ni3", "web-safe").hangul).toBe("니");
  });
  it("성조 번호가 보존된다", () => {
    expect(pinyinSyllableToHangul("hao3", "web-safe").tone).toBe(3);
  });
  it("uan → 완 (ㅘ+ㄴ)", () => {
    expect(pinyinSyllableToHangul("guan1", "web-safe").hangul).toBe("관");
  });
});
