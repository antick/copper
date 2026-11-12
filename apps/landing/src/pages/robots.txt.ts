import { site } from "../lib/site";

export function GET() {
  return new Response(
    `User-agent: *\nAllow: /\n${site.url ? `Sitemap: ${site.url}/sitemap.xml\n` : ""}`,
  );
}
