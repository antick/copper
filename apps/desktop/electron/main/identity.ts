import path from "node:path";
import { APP_IDENTITIES } from "../app-identity.mjs";
import { isPackagedApp } from "./runtime";

export function getAppIdentity(packaged = isPackagedApp()) {
  return packaged ? APP_IDENTITIES.production : APP_IDENTITIES.development;
}

export const APP_IDENTITY = getAppIdentity();

export function userDataPath(
  appDataPath: string,
  override: string | undefined,
  identity = APP_IDENTITY,
): string {
  return override ?? path.join(appDataPath, identity.userDataDirName);
}
