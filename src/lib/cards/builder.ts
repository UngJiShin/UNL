/**
 * 텍스트 → 학습 카드 묶음 생성기.
 * 문장 단위로 카드를 쪼개고 SM-2 초기 상태를 부착한다.
 */

import { convert, detectLanguage, type ConvertOptions } from "@/lib/phonetic";
import { renderRuby, plainHangul } from "@/lib/ruby/renderer";
import { initialState } from "@/lib/srs/sm2";
import { newCardId } from "@/lib/store/cardStore";
import type { Card } from "@/types/card";

export interface BuildCardsInput {
  text: string;
  userId: string;
  meaning?: string;
  mode?: ConvertOptions["mode"];
  language?: ConvertOptions["language"];
  nowMs: number;
}

/** 문장 단위로 분리 — 문장 부호(. ! ? 。！？) 기준으로 쪼갠다. */
function chunk(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /[A-Za-zÀ-ɏ一-鿿]/.test(s));
}

export async function buildCards(input: BuildCardsInput): Promise<Card[]> {
  const language = input.language ?? detectLanguage(input.text);
  const mode = input.mode ?? "web-safe";
  const srs = initialState();
  const due = input.nowMs;

  const sentences = chunk(input.text);
  const cards: Card[] = [];

  for (const piece of sentences) {
    const result = await convert(piece, { language, mode });
    cards.push({
      id: newCardId(),
      userId: input.userId,
      originalText: piece,
      language,
      mode,
      rubyHtml: renderRuby(result),
      plain: plainHangul(result),
      meaning: input.meaning,
      srs,
      nextReviewAt: due,
      createdAt: input.nowMs,
    } satisfies Card);
  }

  return cards;
}
