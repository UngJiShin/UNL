/**
 * 중국어 성조 시각화 메타데이터 (CLAUDE.md 1.2).
 *
 * 성조는 한글 자모를 변형하지 않는다. 음절 상단에 **CSS 가상 요소(::before)**
 * 로 시각 기호를 얹고, 경성은 opacity 로 감쇄한다.
 *   → 자모 위 결합 발음기호(combining diacritics)를 텍스트에 주입하지 않는다.
 *     (특허 회피 원칙: 기존 자모 위 결합 기호 부착 금지)
 *
 * 따라서 렌더러는 음절을 `<span class="unl-tone tone-N">…</span>` 로 감싸기만
 * 하고, 실제 기호 출력은 globals.css 의 `.tone-N::before { content }` 가 담당한다.
 * 아래 `mark` 는 그 CSS content 와 1:1 대응하는 단일 자간 기호(U+02Cx 계열,
 * 결합 문자 아님)로, 문서화/검증용 단일 출처 역할을 한다.
 */

export interface ToneVisual {
  /** 음절 위에 ::before 로 표시할 자간(spacing) 기호. 결합 문자 아님. */
  mark: string;
  /** CSS 클래스명 (프론트엔드 ::before 스타일 훅) */
  className: string;
  label: string;
}

export const TONE_VISUALS: Record<number, ToneVisual> = {
  1: { mark: "ˉ", className: "tone-1", label: "고평조" }, // U+02C9 고평
  2: { mark: "ˊ", className: "tone-2", label: "중고상승조" }, // U+02CA 상승
  3: { mark: "ˇ", className: "tone-3", label: "저하강상승조" }, // U+02C7 하강상승
  4: { mark: "ˋ", className: "tone-4", label: "고하강조" }, // U+02CB 하강
  5: { mark: "", className: "tone-5", label: "경성" }, // 기호 없음, opacity 감쇄
};
