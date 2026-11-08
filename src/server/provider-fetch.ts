// A loopback-only development transport for the integration test harness.
// Production always contacts the fixed official URLs from channels.ts.
export const providerFetch: typeof fetch = async (input, init) => {
  const fixture = process.env.REPLYLOCAL_TEST_PROVIDER_URL;
  if (process.env.NODE_ENV === "development" && fixture) {
    const u = new URL(fixture);
    if (
      u.protocol === "http:" &&
      u.hostname === "127.0.0.1" &&
      u.pathname === "/provider"
    ) {
      u.searchParams.set("target", String(input));
      return fetch(u, init);
    }
  }
  return fetch(input, init);
};
