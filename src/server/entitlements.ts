import type { Query } from "./store";
function cap(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n >= 0 && n <= 10000 ? n : fallback;
}
export async function aiEntitlement(q: Query, organizationId: string) {
  const [billing] = await q<{ plan: string; status: string }>(
    "SELECT plan,status FROM billing_accounts WHERE organization_id=$1",
    [organizationId],
  );
  if (
    billing?.plan === "starter" &&
    ["active", "trialing"].includes(billing.status)
  )
    return cap("AI_STARTER_DAILY_LIMIT", 500);
  if (process.env.BILLING_ENFORCED === "true") return 0;
  return cap("AI_PILOT_DAILY_LIMIT", 50);
}
