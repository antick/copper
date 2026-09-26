import { spawn } from "node:child_process";
import { brandedElectronExecPath } from "./prepare-electron-app.mjs";

const env = { ...process.env };
const execPath = brandedElectronExecPath();
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
