/**
 * 카드 영속 스토어 (인메모리 폴백).
 *
 * DATABASE_URL 설정 시 동일 인터페이스로 PostgreSQL 어댑터를 끼워 넣는다.
 * 개발/데모에서는 프로세스 메모리에 보관한다.
 *
 * 주의: Next.js 개발 서버의 HMR 에서도 단일 인스턴스를 유지하기 위해
 *       globalThis 에 캐싱한다.
 */

import type { Card } from "@/types/card";

export interface CardStore {
  create(card: Card): Promise<Card>;
  get(id: string): Promise<Card | null>;
  update(id: string, patch: Partial<Card>): Promise<Card | null>;
  delete(id: string): Promise<boolean>;
  listDue(userId: string, nowMs: number): Promise<Card[]>;
  listByUser(userId: string): Promise<Card[]>;
  /** 전체 유저 대상으로 beforeMs 이전 복습 예정 카드 조회 (야간 배치용) */
  listAllDueBefore(beforeMs: number): Promise<Card[]>;
}

class InMemoryCardStore implements CardStore {
  private cards = new Map<string, Card>();

  async create(card: Card): Promise<Card> {
    this.cards.set(card.id, card);
    return card;
  }

  async get(id: string): Promise<Card | null> {
    return this.cards.get(id) ?? null;
  }

  async update(id: string, patch: Partial<Card>): Promise<Card | null> {
    const existing = this.cards.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id: existing.id };
    this.cards.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.cards.delete(id);
  }

  async listDue(userId: string, nowMs: number): Promise<Card[]> {
    return [...this.cards.values()]
      .filter((c) => c.userId === userId && c.nextReviewAt <= nowMs)
      .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
  }

  async listByUser(userId: string): Promise<Card[]> {
    return [...this.cards.values()]
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async listAllDueBefore(beforeMs: number): Promise<Card[]> {
    return [...this.cards.values()]
      .filter((c) => c.nextReviewAt <= beforeMs)
      .sort((a, b) => a.nextReviewAt - b.nextReviewAt);
  }
}

const g = globalThis as unknown as { __unlCardStore?: CardStore };

export function getCardStore(): CardStore {
  if (!g.__unlCardStore) {
    // TODO: process.env.DATABASE_URL 있으면 PostgresCardStore 로 교체
    g.__unlCardStore = new InMemoryCardStore();
  }
  return g.__unlCardStore;
}

/** 충돌 가능성이 낮은 카드 ID 생성 (crypto.randomUUID 폴백) */
export function newCardId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `card_${Math.random().toString(36).slice(2)}_${process.hrtime.bigint()}`;
  }
}
