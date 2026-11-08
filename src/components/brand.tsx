import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

/** Brand mark shared by the landing page, auth pages and the workspace. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground",
        className,
      )}
    >
      <MessagesSquare className="size-5" strokeWidth={2.25} />
    </span>
  );
}
export function BrandLink({
  href,
  className,
  compact = false,
}: {
  href: string;
  className?: string;
  /** Hide the word mark below md (used in the narrow workspace sidebar). */
  compact?: boolean;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-lg font-extrabold tracking-tight", className)}>
      <BrandMark />
      <span className={cn("text-lg", compact && "hidden md:inline")}>ReplyLocal</span>
    </Link>
  );
}
