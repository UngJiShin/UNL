import type { Language, PhoneticMode } from "@/lib/phonetic/types";
import type { Sm2State } from "@/lib/srs/sm2";

/** 학습 카드 — CLAUDE.md 2.2 데이터 모델 */
export interface Card {
  id: string;
  userId: string;
  /** 영어/중국어 원문 조각 */
  originalText: string;
  language: Language;
  mode: PhoneticMode;
  /** <ruby> 변환 결과 HTML */
  rubyHtml: string;
  /** 루비 없는 평문 한글 표음 */
  plain: string;
  /** 한국어 뜻 (사용자 입력) */
  meaning?: string;
  /** S3 오디오 URL (TTS 캐시) */
  audioUrl?: string;
  /** SM-2 스케줄링 상태 */
  srs: Sm2State;
  /** 다음 복습 예정(ms epoch) */
  nextReviewAt: number;
  createdAt: number;
}

/** 복습 큐 응답용 경량 뷰 */
export interface DueCard {
  id: string;
  originalText: string;
  rubyHtml: string;
  plain: string;
  meaning?: string;
  audioUrl?: string;
}
