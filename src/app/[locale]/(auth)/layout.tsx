import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { BrandLink, BrandMark } from "@/components/brand";

/** Split layout for sign-in, sign-up, password reset and team invitations. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const h = await getTranslations("home");
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <Link href={`/${locale}`} className="flex w-fit items-center gap-2.5 rounded-lg text-lg font-extrabold">
          <BrandMark className="bg-primary-foreground text-primary" />
          ReplyLocal
        </Link>
        <div className="max-w-md">
          <p className="text-sm font-bold uppercase tracking-wider opacity-80">{h("eyebrow")}</p>
          <p className="mt-4 text-4xl font-extrabold leading-tight">{h("footerTagline")}</p>
          <ul className="mt-8 space-y-4 text-lg font-medium">
            {[h("heroPoint2"), h("c1"), h("c2")].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 size-5 shrink-0 opacity-90" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm opacity-75">{h("footerRights")}</p>
      </aside>
      <div className="flex min-w-0 flex-col">
        <div className="flex h-16 items-center border-b px-4 lg:hidden">
          <BrandLink href={`/${locale}`} />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
