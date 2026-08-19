export default {
  entry: { index: "src/index.ts", client: "src/client/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  external: [/^@deepseek-ai\//],
};
