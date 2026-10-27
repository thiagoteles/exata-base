import { spawn } from "node:child_process";
import process from "node:process";
import ports from "../ports.json" with { type: "json" };

/*
 * The development server, on the product's own app port, so `pnpm dev` on the host answers where
 * APP_URL and the documents say it does. A `--port` given on the command line wins: the compose
 * runs it inside the container on 3000 and publishes that on the app port.
 */

const args = process.argv.slice(2);
const { env } = process;
const server = spawn("next", ["dev", "--webpack", ...args], {
  stdio: "inherit",
  env: { ...env, PORT: env["PORT"] ?? String(ports.app) },
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal === null ? 0 : 1);
});
