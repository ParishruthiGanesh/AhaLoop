import Link from "next/link";

import { cn } from "./ui";

export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "size-7" : "size-8";
  const text = size === "sm" ? "text-[14px]" : "text-[15px]";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          box,
          "grid place-items-center rounded-[9px] bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm",
        )}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none">
          <path
            d="M5 17.5c2.2-6.4 5-9.6 8.4-9.6 2 0 3.1 1.1 3.1 2.6 0 1.7-1.4 2.8-3 2.8-1 0-1.7-.3-2.4-.9"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18.4" cy="6.2" r="1.7" fill="currentColor" />
        </svg>
      </span>
      <span className={cn("whitespace-nowrap font-semibold tracking-[-0.02em] text-slate-900", text)}>
        ThinkTrace <span className="text-brand-600">AI</span>
      </span>
    </span>
  );
}

export function LogoLink({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="rounded-md">
      <Logo />
    </Link>
  );
}
