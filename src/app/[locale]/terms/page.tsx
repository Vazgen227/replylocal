import type { Metadata } from "next";
import { LegalPage, legalTitle } from "@/components/legal-page";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: legalTitle("terms", locale) };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  return <LegalPage kind="terms" locale={locale} />;
}
