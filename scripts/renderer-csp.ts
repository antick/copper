import { contentSecurityPolicy } from "../electron/main/security-policy";

export function rendererCsp() {
  return {
    name: "copper-renderer-csp",
    apply: "build" as const,
    transformIndexHtml() {
      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content: contentSecurityPolicy(),
          },
          injectTo: "head-prepend" as const,
        },
      ];
    },
  };
}
