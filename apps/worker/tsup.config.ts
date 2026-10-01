import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  // Bundle the workspace packages (incl. the generated Prisma client); third-party imports stay external.
  noExternal: [/^@rireki\//],
  clean: true,
  sourcemap: true,
});
