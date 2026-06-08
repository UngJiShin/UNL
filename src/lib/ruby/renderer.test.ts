import { describe, it, expect } from "vitest";
import { renderRuby, plainHangul } from "./renderer";
import { convert } from "@/lib/phonetic";

describe("renderRuby", () => {
  it("원문을 <rb> 기저로, 한글을 <rt> 루비로 얹는다", async () => {
    const html = renderRuby(await convert("pen", { language: "en" }));
    expect(html).toContain("<ruby>");
    expect(html).toContain("pen");
    expect(html).toContain("<rt>");
    expect(html).toContain("펜");
  });

  it("HTML 특수문자를 이스케이프한다", async () => {
    const html = renderRuby(await convert("a<b", { language: "en" }));
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;");
  });

  it("성조는 텍스트에 결합기호를 주입하지 않고 CSS 클래스로만 표시한다", async () => {
    const html = renderRuby(await convert("ma1", { language: "zh" }));
    expect(html).toContain("unl-tone");
    expect(html).toContain("tone-1");
    // U+0300~U+036F 결합 발음기호가 출력에 포함되면 안 된다 (특허 회피 원칙)
    expect(/[̀-ͯ]/.test(html)).toBe(false);
  });

  it("경성(5)은 tone-5 클래스로 감쇄된다", async () => {
    const html = renderRuby(await convert("ma", { language: "zh" }));
    expect(html).toContain("tone-5");
  });
});

describe("plainHangul", () => {
  it("루비 없이 한글만 이어붙인다", async () => {
    expect(plainHangul(await convert("pen", { language: "en" }))).toBe("펜");
  });
});
