import { convert, type ConvertOptions } from "@/lib/phonetic";
import { renderRuby, plainHangul } from "@/lib/ruby/renderer";

export const dynamic = "force-dynamic";

/** POST /api/convert — 텍스트 미리보기 변환 (카드 영속 없음) */
export async function POST(req: Request) {
  let body: { text?: string; mode?: ConvertOptions["mode"]; language?: ConvertOptions["language"] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "유효하지 않은 JSON" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) {
    return Response.json({ error: "text 가 비어 있습니다" }, { status: 400 });
  }

  const result = await convert(text, { mode: body.mode, language: body.language });
  return Response.json({
    language: result.language,
    mode: result.mode,
    syllables: result.syllables,
    rubyHtml: renderRuby(result),
    plain: plainHangul(result),
  });
}
