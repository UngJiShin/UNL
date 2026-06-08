/**
 * 표음 변환 진입점 — Gemini LLM 기반.
 * GEMINI_API_KEY 필수. 미설정 시 에러 반환.
 */

import type { Language, PhoneticMode, PhoneticResult } from "./types";
import { convertEnglish } from "./english";
import { convertChinese } from "./chinese";

export * from "./types";
export { TONE_VISUALS } from "./tone";

export function detectLanguage(text: string): Language {
  if (/[一-鿿]/.test(text)) return "zh";
  if (/[a-z]+[1-5]\b/i.test(text)) return "zh";
  return "en";
}

export interface ConvertOptions {
  language?: Language;
  mode?: PhoneticMode;
}

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

  // 규칙 기반 폴백 (API 키 없거나 LLM 실패 시)
  const syllables =
    language === "zh"
      ? convertChinese(text, mode)
      : convertEnglish(text, mode);
  return { language, mode, syllables };
}
