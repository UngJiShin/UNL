/**
 * Gemini TTS 클라이언트 + 캐시 게이트웨이 (CLAUDE.md 3장).
 *
 * 합성 흐름:
 *   1. cacheKey 생성 → 캐시 조회
 *   2. 히트: 저장된 URL 반환 (Gemini 호출 0회)  ← API 차단 마진
 *   3. 미스: Gemini TTS 합성 → S3 업로드 → 캐시 적재
 *
 * GEMINI_API_KEY 미설정 시 합성을 건너뛰고 mock URL 을 반환한다(개발 모드).
 */

import { cacheKey, getTtsCache, TTS_MODELS, type Tier } from "../cache/ttsCache";

export interface SynthesizeOptions {
  text: string;
  lang: string;
  tier?: Tier;
  /** 배치 파이프라인 경유 여부 (50% 단가) */
  batch?: boolean;
}

export interface SynthesizeResult {
  url: string;
  model: string;
  cached: boolean;
}

/** 실제 Gemini 합성 호출 (스텁). 프로덕션에서 @google/genai 로 교체. */
async function callGeminiTts(
  text: string,
  model: string,
): Promise<{ url: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    // 개발 모드 — 결정적 mock URL
    const id = Buffer.from(text).toString("base64url").slice(0, 16);
    return { url: `https://mock.cdn.local/tts/${model}/${id}.mp3` };
  }
  // TODO: @google/genai 로 실제 합성 후 S3 업로드, CloudFront URL 반환
  throw new Error("실제 Gemini TTS 연동 미구현 (GEMINI_API_KEY 설정됨)");
}

/** 텍스트를 음성으로 합성 — 캐시 우선 */
export async function synthesize(
  opts: SynthesizeOptions,
): Promise<SynthesizeResult> {
  const tier = opts.tier ?? "free";
  const model = TTS_MODELS[tier];
  const cache = getTtsCache();
  const key = cacheKey(opts.text, opts.lang, model);

  const hit = await cache.get(key);
  if (hit) {
    return { url: hit.url, model: hit.model, cached: true };
  }

  const { url } = await callGeminiTts(opts.text, model);
  await cache.set(key, { url, model, createdAt: nowMs() });
  return { url, model, cached: false };
}

/** 테스트 가능성을 위해 시간 소스를 한곳에 모은다. */
function nowMs(): number {
  return Date.now();
}
