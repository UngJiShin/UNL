/**
 * UNL 표음 매핑 규칙 테이블 — 플랫폼의 핵심 IP.
 *
 * 특허 회피 원칙(CLAUDE.md):
 *   KR20130122437A 는 한글 자모 상단에 점(ㆍ) 또는 결합 기호를 추가하는 방식.
 *   UNL 은 그 방식을 절대 사용하지 않는다. 음소 구별은 반드시
 *     - web-safe: 독립된 현대 자모 조합 (예: f → ㅇ+ㅍ, θ → ㄸ)
 *     - old-hangul: 훈민정음 소실 자모 (예: f → ᅗ, v → ᄫ)
 *   로만 구현한다.
 */

import type { PhoneticMode } from "./types";

/** 내부 영어 음소 집합 (ARPAbet 유사). G2P 출력이 이 토큰들로 표현된다. */
export type EnPhoneme =
  // 자음
  | "P" | "B" | "T" | "D" | "K" | "G"
  | "F" | "V" | "TH" | "DH" | "S" | "Z" | "SH" | "ZH"
  | "CH" | "JH" | "M" | "N" | "NG" | "L" | "R" | "W" | "Y" | "H"
  // 모음
  | "AA" | "AE" | "AH" | "AO" | "AW" | "AY" | "EH" | "ER"
  | "EY" | "IH" | "IY" | "OW" | "OY" | "UH" | "UW";

export const EN_VOWELS: ReadonlySet<EnPhoneme> = new Set([
  "AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER",
  "EY", "IH", "IY", "OW", "OY", "UH", "UW",
] as EnPhoneme[]);

/** 영어 모음 음소 → 중성(jungseong) 호환 자모.
 *  이중모음은 ["주모음", "활음음절"] 형태로 분해된다. */
export const EN_VOWEL_JUNG: Record<string, string | [string, string]> = {
  AA: "ㅏ",
  AE: "ㅐ",
  AH: "ㅓ",
  AO: "ㅗ",
  AW: ["ㅏ", "ㅜ"],
  AY: ["ㅏ", "ㅣ"],
  EH: "ㅔ",
  ER: "ㅓ",
  EY: ["ㅔ", "ㅣ"],
  IH: "ㅣ",
  IY: "ㅣ",
  OW: "ㅗ",
  OY: ["ㅗ", "ㅣ"],
  UH: "ㅜ",
  UW: "ㅜ",
};

/**
 * 영어 자음 음소 → 모드별 한글 표기.
 *  - cho:  현대 음절 합성 시 초성으로 쓸 호환 자모 (web-safe)
 *  - jong: 받침으로 붙일 수 있으면 종성 자모, 없으면 null (그 외엔 ㅡ 보강)
 *  - webPrefix: web-safe 구별 표시용 선행 자모 (특허 회피 디지라프)
 *  - old:  옛한글 초성 (첫가끝 조합형 conjoining choseong)
 */
export interface ConsonantRule {
  cho: string;
  jong: string | null;
  webPrefix?: string;
  old: string;
}

export const EN_CONSONANTS: Record<string, ConsonantRule> = {
  P: { cho: "ㅍ", jong: "ㅍ", old: "ㅍ" },
  B: { cho: "ㅂ", jong: "ㅂ", old: "ㅂ" },
  T: { cho: "ㅌ", jong: "ㅌ", old: "ㅌ" },
  D: { cho: "ㄷ", jong: "ㄷ", old: "ㄷ" },
  K: { cho: "ㅋ", jong: "ㄱ", old: "ㅋ" },
  G: { cho: "ㄱ", jong: "ㄱ", old: "ㄱ" },
  // 구별 핵심 자음 (특허 회피 매핑) ----------------------------------
  F: { cho: "ㅍ", jong: "ㅍ", webPrefix: "ㅇ", old: "ᅗ" },
  V: { cho: "ㅂ", jong: "ㅂ", webPrefix: "ㅇ", old: "ᄫ" },
  TH: { cho: "ㄸ", jong: "ㅅ", old: "ᅊ" }, // 무성 /θ/
  DH: { cho: "ㄷ", jong: "ㄷ", webPrefix: "ㅇ", old: "ᅂ" }, // 유성 /ð/
  L: { cho: "ㄹ", jong: "ㄹ", webPrefix: "ㄹ", old: "ᄙ" },
  R: { cho: "ㄹ", jong: "ㄹ", old: "ㄹ" },
  // ----------------------------------------------------------------
  S: { cho: "ㅅ", jong: "ㅅ", old: "ㅅ" },
  Z: { cho: "ㅈ", jong: "ㅅ", old: "ㅈ" },
  SH: { cho: "ㅅ", jong: "ㅅ", old: "ㅅ" },
  ZH: { cho: "ㅈ", jong: "ㅅ", old: "ㅈ" },
  CH: { cho: "ㅊ", jong: "ㅊ", old: "ㅊ" },
  JH: { cho: "ㅈ", jong: "ㅈ", old: "ㅈ" },
  M: { cho: "ㅁ", jong: "ㅁ", old: "ㅁ" },
  N: { cho: "ㄴ", jong: "ㄴ", old: "ㄴ" },
  NG: { cho: "ㅇ", jong: "ㅇ", old: "ㅇ" },
  W: { cho: "ㅇ", jong: null, old: "ㅇ" },
  Y: { cho: "ㅇ", jong: null, old: "ㅇ" },
  H: { cho: "ㅎ", jong: null, old: "ㅎ" },
};

/** 받침으로 붙일 수 있는 자음(종성 적격) — 그 외는 ㅡ 보강 음절 생성 */
export const CODA_ELIGIBLE: ReadonlySet<string> = new Set([
  "N", "NG", "M", "L", "R", "B", "P", "T", "D", "K", "G",
]);

export function isOldMode(mode: PhoneticMode): boolean {
  return mode === "old-hangul";
}
