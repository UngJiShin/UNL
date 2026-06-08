"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "변환 & 카드 생성" },
  { href: "/review", label: "복습 세션" },
];

export function Header() {
  const path = usePathname();
  return (
    <>
      <div className="brand">
        <h1>UNewLanguage</h1>
        <span className="tag">한글 표음 · SM-2 간격 반복</span>
      </div>
      <nav className="tabs">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={path === t.href ? "active" : ""}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
