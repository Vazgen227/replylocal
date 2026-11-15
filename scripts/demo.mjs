// `npm run demo`: the app in development mode with the free demo assistant instead of OpenAI.
// Nothing is written to .env.local; the demo settings exist only for this process.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const port = process.env.DEMO_AI_PORT ?? "54331";
const ai = spawn(process.execPath, [fileURLToPath(new URL("./demo-ai.mjs", import.meta.url))], {
  stdio: "inherit",
  env: { ...process.env, DEMO_AI_PORT: port },
});
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
    REPLYLOCAL_TEST_AI_URL: `http://127.0.0.1:${port}/v1/responses`,
    OPENAI_API_KEY: "demo-not-a-real-key",
    OPENAI_MODEL: "demo",
  },
});
console.log("\nReplyLocal demo: AI answers come from the knowledge base (no OpenAI, no cost).\n");
const stop = () => {
  ai.kill();
  app.kill();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
app.on("exit", (code) => {
  ai.kill();
  process.exit(code ?? 0);
});
