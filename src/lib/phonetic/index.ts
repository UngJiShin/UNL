/**
 * 표음 변환 진입점 — LLM(Gemini) 우선, 규칙 기반 폴백.
 *
 * GEMINI_API_KEY 설정 시: Gemini Flash로 자연스러운 한글 표음
 * 미설정 시: 내장 IPA 규칙 기반 변환 (epitran 대체)
 */

import type { Language, PhoneticMode, PhoneticResult } from "./types";
import { convertEnglish } from "./english";
import { convertChinese } from "./chinese";

export * from "./types";
export { TONE_VISUALS } from "./tone";

/** 매우 단순한 언어 감지: CJK 또는 병음 성조 숫자 패턴이면 중국어로 본다. */
export function detectLanguage(text: string): Language {
  if (/[一-鿿]/.test(text)) return "zh"; // 한자
  if (/[a-z]+[1-5]\b/i.test(text)) return "zh"; // 병음 성조표기
  return "en";
}

export interface ConvertOptions {
  language?: Language;
  mode?: PhoneticMode;
}

/** 텍스트를 한글 표음 음절 배열로 변환한다. LLM 우선, 규칙 기반 폴백. */
export async function convert(
  text: string,
  opts: ConvertOptions = {},
): Promise<PhoneticResult> {
  const language = opts.language ?? detectLanguage(text);
  const mode = opts.mode ?? "web-safe";

  if (process.env.GEMINI_API_KEY) {
    try {
      const { convertWithLLM } = await import("./llm");
      return await convertWithLLM(text, language, mode);
    } catch (e) {
      console.error("[phonetic] LLM 변환 실패, 규칙 기반으로 폴백:", e);
    }
  }

  const syllables =
    language === "zh"
      ? convertChinese(text, mode)
      : convertEnglish(text, mode);
  return { language, mode, syllables };
}
