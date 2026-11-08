import { ResetAccount } from "@/components/omni/account-pages";
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <ResetAccount token={(await searchParams).token ?? ""} />;
}
