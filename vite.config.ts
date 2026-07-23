import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    watch: { ignored: ["**/.playwright-mcp/**"] },
  },
});
