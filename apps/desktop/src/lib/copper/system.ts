import { copperInvoke } from "@/lib/copper/invoke";

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
}

export function appInfo(): Promise<AppInfo> {
  return copperInvoke<AppInfo>("app_info");
}
