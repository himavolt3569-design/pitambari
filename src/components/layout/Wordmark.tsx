import { cn } from "@/lib/utils/cn";
export function Wordmark({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return <span className={cn("shine-wordmark", tone === "light" && "shine-wordmark-light", className)}>
    <span><strong>Super Shine</strong></span>
  </span>;
}
