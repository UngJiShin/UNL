/**
 * 현대 한글 음절 조합 유틸 (웹 안전 모드용).
 *
 * 유니코드 한글 음절 영역(U+AC00~U+D7A3)은 다음 공식으로 합성된다.
 *   S = 0xAC00 + (초성index × 21 + 중성index) × 28 + 종성index
 *
 * 웹 안전 모드는 반드시 이 영역의 "미리 조합된" 음절만 사용하여
 * 폰트 호환성 문제(글자 깨짐)를 원천 차단한다.
 */

const SBASE = 0xac00;
const VCOUNT = 21;
const TCOUNT = 28;

/** 초성 19자 (choseong) — 표준 순서 */
export const CHOSEONG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

/** 중성 21자 (jungseong) — 표준 순서 */
export const JUNGSEONG = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
  "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
] as const;

/** 종성 28자 (jongseong) — index 0 은 받침 없음("") */
export const JONGSEONG = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

export type Choseong = (typeof CHOSEONG)[number];
export type Jungseong = (typeof JUNGSEONG)[number];
export type Jongseong = (typeof JONGSEONG)[number];

/**
 * 초성/중성/종성 호환 자모를 하나의 현대 한글 음절로 합성한다.
 * 잘못된 자모가 들어오면 합성하지 않고 자모를 이어붙여 반환한다(견고성).
 */
export function composeSyllable(
  cho: string,
  jung: string,
  jong: string = "",
): string {
  const ci = (CHOSEONG as readonly string[]).indexOf(cho);
  const vi = (JUNGSEONG as readonly string[]).indexOf(jung);
  const ti = (JONGSEONG as readonly string[]).indexOf(jong);

  if (ci < 0 || vi < 0 || ti < 0) {
    // 합성 불가 — 원본 자모를 그대로 이어붙여 정보 손실을 막는다.
    return `${cho}${jung}${jong}`;
  }
  const code = SBASE + (ci * VCOUNT + vi) * TCOUNT + ti;
  return String.fromCodePoint(code);
}
