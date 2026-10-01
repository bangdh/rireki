import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
  resolve: {
    alias: { "@": import.meta.dirname },
  },
  // tsconfig keeps jsx: preserve for Next; tests importing .tsx components need the automatic runtime here (Vite 8 = Oxc)
  oxc: { jsx: { runtime: "automatic" } },
});
