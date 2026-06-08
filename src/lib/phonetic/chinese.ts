/**
 * 중국어(병음) → 한글 표음 변환 + 성조 시각화.
 *
 * 입력: 병음 음절 (성조 숫자 표기, 예: "ni3 hao3", "zhong1 guo2").
 *   한자 직접 입력은 pypinyin 류 사전이 필요 — 프로덕션 파서 서비스에 위임한다.
 *
 * 핵심 규칙 (CLAUDE.md 1.2):
 *   - 권설음(zh,ch,sh,r) / 치조파찰음(z,c,s) 뒤의 'i' → ㅡ
 *   - 그 외 자음 뒤 'i' → ㅣ
 *   - 성조는 음절 상단 결합 발음기호 + CSS 클래스로 시각화 (받침 추가 아님)
 */

import { composeSyllable } from "../hangul/compose";
import type { PhoneticMode, PhoneticSyllable } from "./types";

/** 성모(initial) → 초성 자모 */
const INITIALS: Record<string, string> = {
  b: "ㅂ", p: "ㅍ", m: "ㅁ", f: "ㅍ",
  d: "ㄷ", t: "ㅌ", n: "ㄴ", l: "ㄹ",
  g: "ㄱ", k: "ㅋ", h: "ㅎ",
  j: "ㅈ", q: "ㅊ", x: "ㅅ",
  zh: "ㅈ", ch: "ㅊ", sh: "ㅅ", r: "ㄹ",
  z: "ㅈ", c: "ㅊ", s: "ㅅ",
};

/** 권설음 + 치조파찰음 — 뒤따르는 'i' 를 ㅡ 로 처리 */
const RETROFLEX_OR_SIBILANT = new Set(["zh", "ch", "sh", "r", "z", "c", "s"]);

/** 운모(final) → [중성, 종성]. 종성 없으면 "". */
const FINALS: Record<string, [string, string]> = {
  a: ["ㅏ", ""], o: ["ㅗ", ""], e: ["ㅓ", ""], er: ["ㅓ", "ㄹ"],
  ai: ["ㅏ", ""], ei: ["ㅔ", ""], ao: ["ㅏ", ""], ou: ["ㅗ", ""],
  an: ["ㅏ", "ㄴ"], en: ["ㅓ", "ㄴ"], ang: ["ㅏ", "ㅇ"], eng: ["ㅓ", "ㅇ"],
  ong: ["ㅜ", "ㅇ"],
  i: ["ㅣ", ""], ia: ["ㅑ", ""], ie: ["ㅖ", ""], iao: ["ㅑ", ""],
  iu: ["ㅠ", ""], ian: ["ㅖ", "ㄴ"], in: ["ㅣ", "ㄴ"],
  iang: ["ㅑ", "ㅇ"], ing: ["ㅣ", "ㅇ"], iong: ["ㅠ", "ㅇ"],
  u: ["ㅜ", ""], ua: ["ㅘ", ""], uo: ["ㅝ", ""], uai: ["ㅙ", ""],
  ui: ["ㅟ", ""], uan: ["ㅘ", "ㄴ"], un: ["ㅜ", "ㄴ"],
  uang: ["ㅘ", "ㅇ"], ueng: ["ㅝ", "ㅇ"],
  "ü": ["ㅟ", ""], "üe": ["ㅞ", ""], "üan": ["ㅞ", "ㄴ"], "ün": ["ㅟ", "ㄴ"],
  v: ["ㅟ", ""], ve: ["ㅞ", ""], van: ["ㅞ", "ㄴ"], vn: ["ㅟ", "ㄴ"],
};

const TONE_REGEX = /^([a-zü]+?)([1-5])?$/i;

/** 병음 음절 1개 파싱 → { initial, final, tone } */
export function parsePinyinSyllable(raw: string): {
  initial: string;
  final: string;
  tone: number;
} | null {
  const m = raw.trim().toLowerCase().match(TONE_REGEX);
  if (!m) return null;
  const body = m[1];
  const tone = m[2] ? parseInt(m[2], 10) : 5; // 숫자 없으면 경성(5) 취급

  // 성모를 최장 일치로 분리 (zh/ch/sh 우선)
  let initial = "";
  for (const cand of ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n",
    "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s"]) {
    if (body.startsWith(cand)) { initial = cand; break; }
  }
  const final = body.slice(initial.length);
  return { initial, final, tone };
}

/** 병음 음절 → 한글 (성조 제외 음가) */
export function pinyinSyllableToHangul(raw: string, mode: PhoneticMode): {
  hangul: string;
  tone: number;
} {
  const parsed = parsePinyinSyllable(raw);
  if (!parsed) return { hangul: raw, tone: 0 };
  const { initial, final, tone } = parsed;

  const cho = initial ? INITIALS[initial] ?? "ㅇ" : "ㅇ";

  // 'i' 단독 운모의 ㅡ/ㅣ 분기
  let lookupFinal = final;
  let jung = "";
  let jong = "";
  if (final === "i" && RETROFLEX_OR_SIBILANT.has(initial)) {
    jung = "ㅡ"; // zhi, chi, shi, ri, zi, ci, si → 즈/츠/스/르 ...
  } else {
    const f = FINALS[lookupFinal];
    if (f) {
      [jung, jong] = f;
    } else {
      jung = "ㅡ";
    }
  }

  const hangul =
    mode === "old-hangul"
      ? `${cho}${jung}${jong}`
      : composeSyllable(cho, jung, jong);
  return { hangul, tone };
}

/** 중국어(병음) 텍스트 → 음절 단위 표음 결과 */
export function convertChinese(
  text: string,
  mode: PhoneticMode,
): PhoneticSyllable[] {
  const tokens = text.split(/(\s+)/);
  const out: PhoneticSyllable[] = [];
  for (const token of tokens) {
    if (token === "") continue;
    if (/^\s+$/.test(token)) {
      out.push({ base: token, hangul: token });
      continue;
    }
    const { hangul, tone } = pinyinSyllableToHangul(token, mode);
    out.push({ base: token, hangul, tone: tone || undefined });
  }
  return out;
}
