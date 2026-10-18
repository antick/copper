import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_IDENTITIES } from "../electron/app-identity.mjs";
import { brandedElectronExecPath } from "./prepare-electron-app.mjs";

export function createDevEnvironment(source = process.env) {
  const env = { ...source };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
}

function launch() {
  const env = createDevEnvironment();
  const execPath = brandedElectronExecPath(APP_IDENTITIES.development);
  if (execPath) {
    env.ELECTRON_EXEC_PATH = execPath;
  }

  const child = spawn("electron-vite", ["dev", ...process.argv.slice(2)], {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  launch();
}
