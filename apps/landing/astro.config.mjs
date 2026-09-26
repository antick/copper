import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { site } from "./src/lib/site";

export default defineConfig({
  site: site.url,
  output: "static",
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
