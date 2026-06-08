/** 표음 변환 공통 타입 */

export type Language = "en" | "zh";

/** 표기 모드 — CLAUDE.md 1장 참조 */
export type PhoneticMode =
  /** 옛한글 자모(첫가끝 조합형). 전용 폰트 필요, 정밀하지만 호환성 리스크. */
  | "old-hangul"
  /** 웹 안전식. 현대 한글 음절 + 보조 자모 조합. 범용 환경 기본값. */
  | "web-safe";

/** 음절 단위 변환 결과 — <ruby> 마운트의 최소 단위 */
export interface PhoneticSyllable {
  /** 원문 조각 (영어 단어 / 중국어 음절) */
  base: string;
  /** 한글 표음 표기 */
  hangul: string;
  /** 성조 (중국어 전용, 1~4, 5=경성) */
  tone?: number;
}

export interface PhoneticResult {
  language: Language;
  mode: PhoneticMode;
  syllables: PhoneticSyllable[];
}
