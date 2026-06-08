/**
 * Free 티어 일일 변환 횟수 제한 미들웨어 (CLAUDE.md 수익화 티어).
 *
 * /api/convert, /api/cards 의 POST(변환·카드 생성)에 IP 기준 일 15회 제한을 건다.
 * Pro/Enterprise 인증이 붙으면 여기서 티어를 식별해 제한을 해제한다.
 */

import { NextResponse, type NextRequest } from "next/server";
import { consume, FREE_DAILY_LIMIT } from "@/lib/limit/rateLimit";

export const config = {
  matcher: ["/api/convert", "/api/cards"],
};

export function middleware(req: NextRequest) {
  // 변환을 유발하는 POST 만 카운트한다 (GET 카드 조회는 무제한).
  if (req.method !== "POST") return NextResponse.next();

  // TODO: 인증 도입 시 Pro/Enterprise 는 제한 면제
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous";

  const decision = consume(`convert:${ip}`);
  const headers = {
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    "X-RateLimit-Reset": String(decision.resetAt),
  };

  if (!decision.allowed) {
    return NextResponse.json(
      {
        error: `무료 플랜 일일 변환 한도(${FREE_DAILY_LIMIT}회)를 초과했습니다. Pro 로 업그레이드하세요.`,
      },
      { status: 429, headers },
    );
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}
