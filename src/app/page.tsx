"use client";

import { useState } from "react";
import { Header } from "./Tabs";

type Mode = "web-safe" | "old-hangul";
type LangTab = "en" | "zh";

interface ConvertResponse {
  language: string;
  mode: string;
  rubyHtml: string;
  plain: string;
}

export default function HomePage() {
  const [langTab, setLangTab] = useState<LangTab>("en");
  const [text, setText] = useState("You're starting to like the gym.");
  const [meaning, setMeaning] = useState("");
  const [mode, setMode] = useState<Mode>("web-safe");
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  function handleTabChange(tab: LangTab) {
    setLangTab(tab);
    setResult(null);
    setError("");
    setSaved(null);
    setText(tab === "zh" ? "ni3 hao3 ma5" : "You're starting to like the gym.");
  }

  async function doConvert() {
    setLoading(true);
    setError("");
    setSaved(null);
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode, language: langTab }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "변환 실패");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveCards() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          meaning: meaning.trim() || undefined,
          mode,
          language: langTab,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "카드 생성 실패");
      setSaved(data.created);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const placeholder =
    langTab === "zh"
      ? 'pinyin 형식으로 입력 (예: "ni3 hao3 ma5")'
      : '영어 텍스트를 입력하세요 (예: "You\'re starting to like the gym.")';

  return (
    <div className="container">
      <Header />

      {/* 언어 탭 */}
      <div className="lang-tabs">
        <button
          className={langTab === "en" ? "lang-tab active" : "lang-tab"}
          onClick={() => handleTabChange("en")}
        >
          🇺🇸 영어 (EN)
        </button>
        <button
          className={langTab === "zh" ? "lang-tab active" : "lang-tab"}
          onClick={() => handleTabChange("zh")}
        >
          🇨🇳 중국어 (ZH)
        </button>
      </div>

      <div className="panel">
        <div className="field">
          <label>
            {langTab === "zh"
              ? "중국어 병음 (pinyin, 성조 숫자 표기)"
              : "영어 원문 텍스트"}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
          />
        </div>

        <div className="field">
          <label>한국어 뜻 (선택)</label>
          <textarea
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="예: 당신은 체육관을 좋아하기 시작하고 있어."
            rows={2}
          />
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <div className="field">
            <label>표기 모드</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="web-safe">웹 안전식 (범용)</option>
              <option value="old-hangul">옛한글 자모 (정밀)</option>
            </select>
          </div>
          <div className="grow" />
          <button onClick={doConvert} disabled={loading}>
            변환 미리보기
          </button>
          <button className="secondary" onClick={saveCards} disabled={loading}>
            복습 카드로 저장
          </button>
        </div>

        {error && (
          <p className="error" style={{ marginTop: 12 }}>
            ⚠ {error}
          </p>
        )}
        {saved !== null && (
          <p className="muted" style={{ marginTop: 12 }}>
            ✅ {saved}개 문장을 복습 큐에 추가했습니다.{" "}
            <a href="/review">복습 시작 →</a>
          </p>
        )}
      </div>

      {result && (
        <div className="panel">
          <div className="row" style={{ marginBottom: 12 }}>
            <span className="pill">언어: {result.language}</span>
            <span className="pill">모드: {result.mode}</span>
          </div>
          <div
            className="ruby-output"
            dangerouslySetInnerHTML={{ __html: result.rubyHtml }}
          />
          <p className="muted" style={{ marginTop: 12 }}>
            평문 표음: {result.plain}
          </p>
        </div>
      )}
    </div>
  );
}
