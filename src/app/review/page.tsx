"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "../Tabs";
import { review as sm2Review } from "@/lib/srs/sm2";
import type { Sm2State } from "@/lib/srs/sm2";

interface DueCard {
  id: string;
  originalText: string;
  rubyHtml: string;
  plain: string;
  meaning?: string;
  audioUrl?: string;
  srs: Sm2State;
}

const GRADES = [
  { q: 5, label: "Perfect", desc: "즉각·정확" },
  { q: 4, label: "Good", desc: "약간 망설임" },
  { q: 3, label: "Pass", desc: "간신히 인출" },
  { q: 2, label: "Hard", desc: "확인 후 인지" },
  { q: 1, label: "Bad", desc: "조음 불가" },
  { q: 0, label: "Blackout", desc: "연상 불가" },
];

/** 현재 SM-2 상태에서 q=4(Good)로 N회 시뮬레이션해 누적 일수 반환 */
function projectSchedule(srs: Sm2State, steps = 7): { review: number; day: number }[] {
  const points: { review: number; day: number }[] = [];
  let state = srs;
  let cumDay = 0;
  for (let i = 0; i < steps; i++) {
    state = sm2Review(state, 4);
    cumDay += state.interval;
    points.push({ review: i + 1, day: cumDay });
  }
  return points;
}

function ScheduleTimeline({ srs }: { srs: Sm2State }) {
  const points = projectSchedule(srs);
  const maxDay = points[points.length - 1].day;

  // 로그 스케일로 위치 계산 (1일~수백일 모두 표시 가능하게)
  function pct(day: number) {
    return (Math.log(day + 1) / Math.log(maxDay + 1)) * 100;
  }

  return (
    <div className="schedule-box">
      <p className="schedule-title">예상 복습 일정 <span className="muted">(Good 기준 시뮬레이션)</span></p>
      <div className="schedule-track">
        <div className="schedule-line" />
        {/* 오늘 */}
        <div className="schedule-dot today" style={{ left: "0%" }}>
          <span className="schedule-label">오늘</span>
        </div>
        {points.map((p) => (
          <div key={p.review} className="schedule-dot" style={{ left: `${pct(p.day)}%` }}>
            <span className="schedule-label">
              {p.day < 30 ? `+${p.day}일` : `+${Math.round(p.day / 30)}개월`}
            </span>
          </div>
        ))}
      </div>
      <div className="schedule-intervals">
        {points.map((p, i) => (
          <span key={p.review} className="schedule-chip">
            {i + 1}차: {p.day}일
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const [queue, setQueue] = useState<DueCard[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastInterval, setLastInterval] = useState<number | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cards?due=true");
    const data = await res.json();
    setQueue(data.cards ?? []);
    setIdx(0);
    setRevealed(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const current = queue[idx];

  function advance(newQueue?: DueCard[]) {
    const q = newQueue ?? queue;
    setRevealed(false);
    if (idx + 1 < q.length) {
      setIdx(idx + 1);
    } else {
      loadQueue();
    }
  }

  async function grade(q: number) {
    if (!current) return;
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: current.id, q }),
    });
    const data = await res.json();
    setLastInterval(data.intervalDays ?? null);
    advance();
  }

  async function deleteCard() {
    if (!current) return;
    await fetch(`/api/cards/${current.id}`, { method: "DELETE" });
    const newQueue = queue.filter((c) => c.id !== current.id);
    setQueue(newQueue);
    setRevealed(false);
    if (idx >= newQueue.length) {
      setIdx(Math.max(0, newQueue.length - 1));
    }
  }

  return (
    <div className="container">
      <Header />

      {loading ? (
        <div className="panel muted">불러오는 중…</div>
      ) : !current ? (
        <div className="panel">
          <p>복습할 카드가 없습니다.</p>
          <p className="muted">
            <a href="/">변환 페이지</a>에서 텍스트를 카드로 저장해 보세요.
          </p>
        </div>
      ) : (
        <>
          <div className="panel review-card">
            <div className="review-header">
              <p className="muted">
                {idx + 1} / {queue.length}
                {lastInterval !== null && ` · 직전 카드 다음 복습: ${lastInterval}일 후`}
              </p>
              <button className="btn-delete" onClick={deleteCard} title="카드 삭제">
                삭제
              </button>
            </div>
            <div className="sentence">{current.originalText}</div>
            {current.meaning && (
              <p className="muted" style={{ marginTop: 8, fontSize: "0.95rem" }}>
                뜻: {current.meaning}
              </p>
            )}

            {revealed ? (
              <>
                <div
                  className="ruby-output"
                  style={{ marginTop: 20, textAlign: "center" }}
                  dangerouslySetInnerHTML={{ __html: current.rubyHtml }}
                />
                <p className="muted" style={{ marginTop: 8 }}>
                  {current.plain}
                </p>
                <div className="grade-buttons">
                  {GRADES.map((g) => (
                    <button key={g.q} onClick={() => grade(g.q)}>
                      {g.q} · {g.label}
                      <small>{g.desc}</small>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ marginTop: 24 }}>
                <button onClick={() => setRevealed(true)}>표음 확인</button>
              </div>
            )}
          </div>

          <ScheduleTimeline srs={current.srs} />
        </>
      )}
    </div>
  );
}
