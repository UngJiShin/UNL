# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

**UNewLanguage(UNL)** 는 영어·중국어 텍스트를 한글 표음문자로 자동 변환하고, SM-2(SuperMemo-2) 기반 간격 반복 복습 카드를 생성하는 에듀테크 SaaS 플랫폼입니다. 핵심 가치는 세 가지입니다.

1. **독자 표음 규칙** — 현행 외래어 표기법의 조음 구별 불가를 보완하고, 특허 KR20130122437A와 기술적으로 완전 분리된 두 가지 표기법(옛한글 자모 / 웹 안전식)을 제공합니다.
2. **SM-2 SRS 엔진** — 에빙하우스 망각곡선 기반으로 복습 인터벌을 자동 조정합니다.
3. **Gemini TTS + 비용 최적화** — Gemini 2.5 Flash TTS + Batch API + Redis/CDN 캐싱으로 오디오 비용을 최소화합니다.

---

## 권장 기술 스택

아직 코드가 없는 그린필드 프로젝트입니다. 아래 스택을 기준으로 구현을 시작하세요.

| 레이어 | 기술 | 이유 |
|--------|------|------|
| 프론트엔드 | Next.js 14 (App Router) + TypeScript | SSR/SSG, `<ruby>` 태그 렌더링, CJK 폰트 최적화 |
| 백엔드 API | Next.js API Routes 또는 FastAPI(Python) | 음소 파서는 Python NLP 라이브러리(epitran, pypinyin)가 적합 |
| 음소 파서 | Python 마이크로서비스 | epitran(영어 IPA), pypinyin(중국어 병음) → UNL 규칙 매핑 |
| 데이터베이스 | PostgreSQL | 유저, 카드, SM-2 상태 저장 |
| 캐시 | Redis | TTS 오디오 MD5 해시 색인, 세션 |
| 오디오 스토리지 | AWS S3 + CloudFront CDN | 사전 생성 오디오 서빙 |
| TTS | Google Gemini API | 2.5 Flash TTS (무료 유저), 3.1 Flash TTS (Pro) |
| 배치 처리 | BullMQ (Redis 기반) 또는 Python Celery | 야간 SM-2 스케줄 + 오디오 사전 생성 |
| 크롬 익스텐션 | Manifest V3 (Vanilla JS) | 웹 문맥 주입 기능 |

---

## 핵심 도메인 지식

### 표음 변환 파이프라인

```
입력 텍스트
  → 언어 감지 (영어 / 중국어)
  → 음소 분석 (영어: IPA via epitran / 중국어: 병음 via pypinyin)
  → UNL 규칙 매핑 (옛한글 모드 OR 웹 안전 모드)
  → <ruby> HTML 생성
  → 카드 객체 생성 (SM-2 초기 파라미터 부착)
```

**두 가지 표기 모드**

- **옛한글 모드**: 첫가끝 조합형 유니코드(U+1100~U+11FF) 사용. 옛한글 전용 폰트(Noto Serif KR 등) 필요. 웹 환경에서 깨짐 가능 → 폰트 로드 확인 필수.
- **웹 안전 모드**: 현대 한글 자모 조합으로만 표기 (`ㅇㅍ`, `ㄹㄹ` 등). 범용 환경 기본값.

**영어 핵심 매핑 (웹 안전 기준)**

| IPA | 웹 안전 | 옛한글 |
|-----|---------|--------|
| /f/ | ㅇㅍ | ᅗ |
| /v/ | ㅇㅂ | ㅸ |
| /l/ | ㄹㄹ | ᄙ |
| /θ/ | ㄸ | ᅊ |
| /ð/ | ㅇㄷ | ᅂ |

**중국어 파서 주의사항**

- 모음 `i`가 권설음(zh/ch/sh/r) 또는 치조파찰음(z/c) 뒤에 오면 → `ㅡ`로 렌더링
- 그 외 자음 뒤 `i` → `ㅣ`로 렌더링
- 성조는 음절 상단에 CSS 가상 요소(`::before`)로 시각 기호 부착, 경성은 `opacity: 0.5`

### SM-2 카드 데이터 모델

```typescript
interface Card {
  id: string
  userId: string
  originalText: string    // 영어/중국어 원문
  rubyHtml: string        // <ruby> 변환 결과
  audioUrl?: string       // S3 오디오 URL (캐시)
  n: number               // 반복 계수 (초기값 0)
  ef: number              // 이지 팩터 (초기값 2.5, 최솟값 1.3)
  interval: number        // 다음 복습까지 일수
  nextReviewAt: Date      // 다음 복습 예정일
  createdAt: Date
}
```

**SM-2 인터벌 계산**

```
n=1 → interval = 1일
n=2 → interval = 6일
n>2 → interval = round(이전_interval × ef)

ef' = max(1.3, ef + (0.1 - (5-q) × (0.08 + (5-q) × 0.02)))

q < 3 이면 n = 0으로 초기화, ef는 유지
```

### TTS 비용 관리 규칙

1. **캐시 우선**: 텍스트를 MD5 해싱 → Redis 조회 → 히트 시 S3 URL 반환, API 호출 없음
2. **실시간**: 캐시 미스 시 Gemini 2.5 Flash TTS 호출 (무료 유저) / 3.1 Flash TTS (Pro 유저)
3. **배치**: SM-2 스케줄러가 내일 복습 예정 카드를 야간에 Batch API로 일괄 생성 → S3 적재
4. **Batch API 단가**: 입력 $0.075/1M, 출력 오디오 $3.00/1M (표준 대비 50% 절감)

---

## 시스템 아키텍처

```
[브라우저 / 크롬 익스텐션]
        │
        ▼
[Next.js 프론트엔드]  ←──────────────────────────────────┐
        │                                                 │
        ▼                                                 │
[Next.js API / FastAPI 백엔드]                            │
   ├── /api/convert     ← 텍스트 → Ruby HTML             │
   ├── /api/cards       ← SM-2 CRUD                      │
   ├── /api/review      ← 복습 제출 (q값 처리)            │
   └── /api/audio       ← TTS URL 반환                   │
        │                                                 │
   ┌────┴────────────────────┐                           │
   ▼                         ▼                           │
[Python 음소 파서 MS]    [Redis 캐시]                     │
  epitran + pypinyin      TTS MD5 색인                   │
        │                    │ 히트                       │
        │              [AWS S3 + CloudFront] ────────────┘
        │                    │ 미스
        └──────────────── [Gemini TTS API]
                         (실시간 / Batch)

[BullMQ 배치 워커]  ← 야간 SM-2 스케줄 + 오디오 사전 생성
```

### 데이터 흐름: 텍스트 → 카드 생성

1. 사용자가 텍스트 붙여넣기 → `/api/convert` 호출
2. 언어 감지 후 Python 파서 마이크로서비스로 전달
3. 파서가 IPA/병음 추출 → UNL 규칙 적용 → `<ruby>` HTML 반환
4. 카드 객체 생성 (n=0, ef=2.5, interval=1, nextReviewAt=지금+1일)
5. PostgreSQL 저장, Redis에 TTS 캐시 키 예약
6. 배치 워커가 야간에 Gemini Batch API로 오디오 생성 → S3 저장

### 데이터 흐름: 복습 세션

1. `/api/cards?due=true` → nextReviewAt ≤ now인 카드 조회
2. 카드 표시 (Ruby HTML + 오디오)
3. 사용자가 q(0~5) 제출 → `/api/review`
4. SM-2 파라미터 갱신 (ef, interval, nextReviewAt 업데이트)
5. q < 3이면 n=0 초기화, 당일 재노출 큐 편입

---

## 수익화 티어별 기술 제약

| 기능 | Free | Pro | Enterprise |
|------|------|-----|-----------|
| 일일 변환 횟수 | 15회 미들웨어 제한 | 무제한 | 무제한 |
| TTS 모델 | Gemini 2.5 Flash | Gemini 3.1 Flash (24kHz) | 배치 전용 파이프라인 |
| 오디오 품질 | 표준 | HQ 16bit mono | 단체 배치 |
| 저장소 | 없음 | 개인 저장소 | 학원별 네임스페이스 |
| PDF 출력 | 불가 | 불가 | Ruby 포함 인쇄용 PDF |

---

## 특허 회피 원칙 (필수 준수)

KR20130122437A는 한글 자모 **상단에 점(ㆍ)을 추가하는 방식**으로 음소를 구분합니다. UNL은 이 방식을 절대 사용하지 않습니다.

- 음소 구별은 반드시 **독립된 자모 조합** (웹 안전) 또는 **훈민정음 소실 자모** (옛한글)로만 구현
- 기존 자모 위에 결합 기호(U+02XX 계열 combining diacritics)를 붙이는 방식도 금지

---

## 개발 시작 순서 (권장)

1. **음소 파서 Python 서비스** — `epitran` + `pypinyin` 기반 IPA/병음 추출 → UNL 규칙 매핑 테이블 구현. 이것이 플랫폼의 핵심 IP.
2. **SM-2 엔진** — 순수 함수로 구현 후 단위 테스트 작성. `calculateNextInterval(n, ef, q)` → `{newN, newEF, newInterval}`.
3. **Ruby HTML 렌더러** — 파서 출력을 `<ruby>` 태그로 조립. 옛한글/웹 안전 모드 분기.
4. **Next.js 프론트엔드** — 카드 생성 UI, 복습 세션 UI.
5. **TTS 캐싱 레이어** — Redis MD5 캐시 → Gemini API 연동.
6. **배치 워커** — BullMQ로 야간 오디오 사전 생성.
7. **크롬 익스텐션** — 웹 문맥 주입 (Manifest V3).

---

## 환경 변수

```
GEMINI_API_KEY=
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AWS_S3_BUCKET=
AWS_CLOUDFRONT_DOMAIN=
PHONEME_SERVICE_URL=http://localhost:8000   # Python 파서 마이크로서비스
```
