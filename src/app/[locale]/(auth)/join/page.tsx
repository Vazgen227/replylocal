import { JoinAccount } from "@/components/omni/account-pages";
export default async function Join({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <JoinAccount token={(await searchParams).token ?? ""} />;
}
