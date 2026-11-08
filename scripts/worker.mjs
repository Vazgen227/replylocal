// Run on any always-on Node host, separately from the Next web process.
import "./env.mjs";
if (!process.env.APP_URL || !process.env.CRON_SECRET)
  throw new Error("APP_URL and CRON_SECRET required");
const url = new URL("/api/jobs/run", process.env.APP_URL);
if (url.protocol !== "https:" && process.env.NODE_ENV === "production")
  throw new Error("HTTPS APP_URL required");
let stop = false;
process.on("SIGTERM", () => {
  stop = true;
});
process.on("SIGINT", () => {
  stop = true;
});
while (!stop) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.CRON_SECRET },
      signal: AbortSignal.timeout(65000),
    });
    if (!response.ok) console.error("[worker] HTTP", response.status);
  } catch {
    console.error("[worker] request failed; retrying");
  }
  if (!stop) await new Promise((resolve) => setTimeout(resolve, 5000));
}
