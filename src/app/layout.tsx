import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UNewLanguage — 한글 표음 학습 플랫폼",
  description:
    "영어·중국어를 한글 표음문자로 변환하고 SM-2 간격 반복으로 복습하는 에듀테크 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
