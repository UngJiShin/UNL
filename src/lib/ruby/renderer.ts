/**
 * <ruby> HTML 렌더러 (CLAUDE.md 1.3).
 *
 * 원문은 기저 텍스트 레이어로 유지하고, 한글 표음을 <rt> 루비 레이어로 얹는다.
 * 옛한글 폰트 미지원 환경에서도 원문(<rb>)은 항상 읽힌다 → 강건성 확보.
 * 중국어는 성조 시각화 클래스를 <rt> 에 부착한다.
 */

import type { PhoneticResult } from "../phonetic/types";
import { TONE_VISUALS } from "../phonetic/tone";

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c]);
}

/** 변환 결과를 <ruby> 마크업 문자열로 렌더한다. */
export function renderRuby(result: PhoneticResult): string {
  const parts = result.syllables.map((syl) => {
    // 공백/구두점 등 표음이 원문과 동일하면 루비를 달지 않는다.
    if (syl.hangul === syl.base || /^\s+$/.test(syl.base)) {
      return escapeHtml(syl.base);
    }

    const base = escapeHtml(syl.base);
    let rt = escapeHtml(syl.hangul);

    if (syl.tone && TONE_VISUALS[syl.tone]) {
      const t = TONE_VISUALS[syl.tone];
      // 성조 기호는 텍스트에 주입하지 않는다. 음절을 감싸기만 하고
      // 실제 기호는 CSS `.tone-N::before` 가상 요소가 음절 상단에 얹는다.
      rt = `<span class="unl-tone ${t.className}">${rt}</span>`;
    }

    return `<ruby>${base}<rp>(</rp><rt>${rt}</rt><rp>)</rp></ruby>`;
  });

  return `<span class="unl-ruby" lang="${result.language}">${parts.join("")}</span>`;
}

/** 카드 표시용 평문 표음 (루비 없이 한글만 이어붙임) */
export function plainHangul(result: PhoneticResult): string {
  return result.syllables.map((s) => s.hangul).join("");
}
