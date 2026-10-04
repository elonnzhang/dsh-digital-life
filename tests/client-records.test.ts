import { describe, expect, it } from "vitest";
import { applyAgentMarkdown } from "../src/client/agent-file.js";
import { EMPTY_RECORD, recordProblem } from "../src/client/records.js";
import type { DigitalLifeRecord } from "../src/types.js";

const valid: DigitalLifeRecord = {
  ...EMPTY_RECORD,
  id: "analyst",
  name: "分析师",
  description: "负责分析",
  tags: ["分析"],
  persona: "你是分析师",
};

describe("agent file import", () => {
  it("reads id and name from frontmatter and keeps the body inline", () => {
    const markdown = '﻿---\r\nname: user-li\r\ndescription: "李雷（产品）"\r\n---\r\n你是李雷。\r\n';
    expect(applyAgentMarkdown(markdown, "ignored.md", { ...EMPTY_RECORD, agent: "x.md" })).toEqual({
      ...EMPTY_RECORD,
      id: "user-li",
      name: "李雷（产品）",
      persona: "你是李雷。",
    });
  });

  it("falls back to the file name and rejects an empty body", () => {
    expect(applyAgentMarkdown("身份正文", "user-han.md", { ...EMPTY_RECORD })?.id).toBe("user-han");
    expect(applyAgentMarkdown("身份", "Bad Name.md", { ...EMPTY_RECORD, id: "kept" })?.id).toBe("kept");
    expect(applyAgentMarkdown("---\nname: x\n---\n  \n", "x.md", { ...EMPTY_RECORD })).toBeUndefined();
  });
});

describe("record validation", () => {
  it("accepts a complete record and flags missing fields", () => {
    expect(recordProblem(valid, new Set(), undefined)).toBeUndefined();
    const problem = recordProblem({ ...valid, name: "", persona: "" }, new Set(), undefined);
    expect(problem?.reason).toBe("required");
    expect([...(problem?.fields ?? [])].sort()).toEqual(["name", "persona"]);
  });

  it("rejects malformed and duplicate ids except the record being edited", () => {
    expect(recordProblem({ ...valid, id: "Bad Id" }, new Set(), undefined)?.reason).toBe("invalidId");
    expect(recordProblem(valid, new Set(["analyst"]), undefined)?.reason).toBe("duplicateId");
    expect(recordProblem(valid, new Set(["analyst"]), "analyst")).toBeUndefined();
  });
});
