import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  dsh: { bundle: { patch: string[] } };
  files: string[];
};
const preset = readFileSync(resolve(root, "digital-life-mode.patch.yml"), "utf8");
const devPatch = readFileSync(resolve(root, "scripts/dev-patch.mjs"), "utf8");

describe("digital-life preset bundle", () => {
  it("ships a named composition in the installed bundle", () => {
    expect(manifest.dsh.bundle.patch).toContain("./digital-life-mode.patch.yml");
    expect(manifest.files).toContain("digital-life-mode.patch.yml");
    expect(preset).toContain("name: '@deepseek-ai/dsh-agent-preset'");
    expect(preset).toContain("id: digital-life-mode");
    expect(preset).toContain("name: 数字生命模式");
    expect(preset).toContain("name: '@deepseek-ai/dsh-persona'");
  });

  it("uses the same preset declaration in the development overlay", () => {
    expect(devPatch).toContain('resolve(root, "digital-life-mode.patch.yml")');
    expect(devPatch).toContain('readFileSync(preset, "utf8")');
  });
});
