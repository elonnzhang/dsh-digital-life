import { describe, expect, it } from "vitest";
import { normalizeDigitalLifeRecord } from "../src/client/DigitalLifeSettingSection.js";
import { validateSettings } from "../src/index.js";
import type { DigitalLifeRecord } from "../src/types.js";

const draft: DigitalLifeRecord = {
  id: " test-agent ",
  name: " 测试代理 ",
  description: " 测试描述 ",
  category: "business",
  tags: [" 测试 "],
  persona: " 你是测试代理 ",
  enabled: true,
};

describe("digital-life record normalization", () => {
  it("preserves inline persona when the agent path is omitted", () => {
    const normalized = normalizeDigitalLifeRecord(draft);

    expect(normalized).toMatchObject({
      id: "test-agent",
      name: "测试代理",
      description: "测试描述",
      tags: ["测试"],
      persona: "你是测试代理",
      agent: "test-agent/agents/test-agent.md",
    });
    expect(() => validateSettings({ records: [normalized] })).not.toThrow();
  });

  it("uses an explicit agent path instead of inline persona", () => {
    const normalized = normalizeDigitalLifeRecord({
      ...draft,
      agent: " ~/.agent/agents/test-agent.md ",
    });

    expect(normalized.agent).toBe("~/.agent/agents/test-agent.md");
    expect(normalized.persona).toBe("");
    expect(() => validateSettings({ records: [normalized] })).not.toThrow();
  });

  it("preserves persona edits for the managed agent binding", () => {
    const normalized = normalizeDigitalLifeRecord({
      ...draft,
      agent: "test-agent/agents/test-agent.md",
      persona: " 更新后的人格 ",
    });

    expect(normalized.agent).toBe("test-agent/agents/test-agent.md");
    expect(normalized.persona).toBe("更新后的人格");
  });
});
