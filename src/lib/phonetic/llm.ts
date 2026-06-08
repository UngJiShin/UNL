/**
 * Gemini Flash 기반 LLM 표음 변환기.
 * GEMINI_API_KEY 설정 시 규칙 기반 파서 대신 호출된다.
 */

import type { Language, PhoneticMode, PhoneticResult, PhoneticSyllable } from "./types";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

function makeEnglishPrompt(text: string): string {
  return `Convert each English word to Korean phonetic transcription (한글 발음).

Follow how Koreans naturally pronounce English words. Use standard Korean phonetics.

Examples of correct transcription:
You're → 유얼
starting → 스타팅
to → 투
like → 라이크
the → 더
gym → 짐
fun → 펀
very → 베리
think → 띵크
this → 디스
that → 댓
hello → 헬로
world → 월드
coffee → 커피
computer → 컴퓨터
love → 러브
good → 굿
I → 아이
am → 앰
is → 이즈
are → 아
have → 해브
will → 윌
can → 캔
not → 낫
what → 왓
how → 하우
why → 와이
when → 웬
where → 웨어
who → 후
time → 타임
day → 데이
go → 고우
come → 컴
see → 씨
know → 노우
want → 원트
make → 메이크
get → 겟
take → 테이크
look → 룩
back → 백
just → 저스트
people → 피플
school → 스쿨
music → 뮤직
video → 비디오
phone → 폰
water → 워터
food → 푸드
family → 패밀리
friend → 프렌드
work → 워크
play → 플레이
need → 니드
year → 이어
night → 나이트
life → 라이프
right → 라이트
think → 띵크
big → 빅
little → 리틀
long → 롱
great → 그레이트
old → 올드
new → 뉴
first → 퍼스트
last → 라스트
own → 오운
other → 아더

Rules:
- Transcribe based on actual pronunciation, not spelling
- Keep punctuation (.,!?) attached to the word in "word" field, copy to "hangul" field
- Space tokens: {"word":" ","hangul":" "}
- Contractions: You're→유얼, I'm→아임, It's→잇츠, Don't→돈트, Can't→캔트

Input text: ${JSON.stringify(text)}

Return ONLY a JSON array, no markdown, no explanation:
[{"word":"token","hangul":"한글발음"}, ...]`;
}

function makeChinesePrompt(text: string): string {
  return `Convert each Chinese pinyin syllable to Korean phonetic transcription (한글 발음).

Examples:
ni3 → 니
hao3 → 하오
ma5 → 마
zhong1 → 중
guo2 → 궈
zhi1 → 즈
chi1 → 츠
shi4 → 스
ri4 → 르
zi4 → 즈
ci4 → 츠
si4 → 쓰
wo3 → 워
de5 → 더
ta1 → 타
men5 → 먼
you3 → 요우
he2 → 허
zai4 → 짜이
bu4 → 뿌
yi1 → 이
er4 → 얼
san1 → 싼

Rules:
- Retroflex initials (zh, ch, sh, r) + i → transcribe as ㅡ vowel (즈, 츠, 스, 르)
- Sibilants (z, c, s) + i → transcribe as ㅡ vowel (즈, 츠, 쓰)
- Other consonants + i → transcribe as ㅣ vowel
- Ignore tone numbers, transcribe pronunciation only
- Space tokens: {"word":" ","hangul":" "}

Input text: ${JSON.stringify(text)}

Return ONLY a JSON array, no markdown, no explanation:
[{"word":"token","hangul":"한글발음"}, ...]`;
}

interface WordMap {
  word: string;
  hangul: string;
}

async function callGemini(prompt: string, apiKey: string): Promise<WordMap[]> {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.05, maxOutputTokens: 2048 },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const clean = raw.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
  return JSON.parse(clean) as WordMap[];
}

export async function convertWithLLM(
  text: string,
  language: Language,
  mode: PhoneticMode,
): Promise<PhoneticResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const prompt = language === "zh" ? makeChinesePrompt(text) : makeEnglishPrompt(text);
  const words = await callGemini(prompt, apiKey);

  const syllables: PhoneticSyllable[] = words.map((w) => ({
    base: w.word,
    hangul: w.hangul,
  }));

  return { language, mode, syllables };
}
