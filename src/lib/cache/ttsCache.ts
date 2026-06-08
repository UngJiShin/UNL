/**
 * TTS 캐싱 레이어 (CLAUDE.md 3.2).
 *
 * 비용 최적화 핵심: 텍스트를 MD5 해싱해 캐시 키로 쓴다.
 *   캐시 히트  → Gemini API 호출 0회, S3/CDN URL 즉시 반환
 *   캐시 미스  → Gemini TTS 호출 후 결과를 캐시에 적재
 *
 * 본 구현은 인터페이스 + 인메모리 폴백을 제공한다. REDIS_URL/AWS_* 가
 * 설정되면 동일 인터페이스로 Redis/S3 어댑터를 끼워 넣으면 된다.
 */

import { createHash } from "node:crypto";

export interface TtsCacheEntry {
  /** S3/CDN 오디오 URL */
  url: string;
  /** 합성에 사용한 모델 */
  model: string;
  createdAt: number;
}

export interface TtsCache {
  get(key: string): Promise<TtsCacheEntry | null>;
  set(key: string, entry: TtsCacheEntry): Promise<void>;
}

/** 캐시 키 생성 — 원문 + 언어 + 음성 모델을 결합해 MD5 해싱 */
export function cacheKey(text: string, lang: string, model: string): string {
  return createHash("md5").update(`${lang}:${model}:${text}`).digest("hex");
}

/** 프로세스 메모리 기반 폴백 캐시 (개발/단일 인스턴스용) */
export class InMemoryTtsCache implements TtsCache {
  private store = new Map<string, TtsCacheEntry>();

  async get(key: string): Promise<TtsCacheEntry | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, entry: TtsCacheEntry): Promise<void> {
    this.store.set(key, entry);
  }
}

/** 요금제 → 기본 TTS 모델 매핑 (CLAUDE.md 3.1) */
export const TTS_MODELS = {
  free: "gemini-2.5-flash-tts",
  pro: "gemini-3.1-flash-tts",
  enterprise: "gemini-2.5-flash-tts", // 배치 파이프라인 전용
} as const;

export type Tier = keyof typeof TTS_MODELS;

let singleton: TtsCache | null = null;

/** 환경에 맞는 캐시 구현 반환 (현재는 인메모리 폴백) */
export function getTtsCache(): TtsCache {
  if (!singleton) {
    // TODO: process.env.REDIS_URL 있으면 RedisTtsCache 로 교체
    singleton = new InMemoryTtsCache();
  }
  return singleton;
}
