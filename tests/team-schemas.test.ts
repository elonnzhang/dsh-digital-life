import { describe, expect, it } from "vitest";
import { assertObjectJsonSchema } from "@deepseek-ai/dsh-tools";
import { BRIEF_OUTPUT_SCHEMA, CRITIQUE_OUTPUT_SCHEMA, parseBriefReport, parseCritiqueReport, parseSynthesisReport, SYNTHESIS_OUTPUT_SCHEMA } from "../src/host/team-schemas.js";
import type { SynthesisReport } from "../src/expert-types.js";

const ev = new Set(["input:brief@1", "ref-1"]);
const inputs = new Set(["analysis-alpha-1", "analysis-beta-1"]);
function synthesis(patch: Partial<SynthesisReport> = {}): SynthesisReport {
  return {
    summary: "Run a pilot", findings: [{ claim: "Baseline missing", kind: "observation", evidenceIds: ["input:brief@1"] }],
    assumptions: [], nextActions: ["Define baseline"],
    disagreements: [{ topic: "Sample size", positions: [{ stageId: "analysis-alpha-1", position: "30" }, { stageId: "analysis-beta-1", position: "100" }], type: "assumption", resolution: "experiment", test: "Power analysis" }],
    options: [{ name: "Pilot", tradeoffs: "Cheap but noisy" }], validationPlan: [{ task: "Pilot", decides: "Sample size", stopCondition: "CI < 10%" }],
    missingStages: [], ...patch,
  };
}

describe("team report schemas", () => {
  it("declares object schemas accepted by dsh-tools", () => {
    for (const schema of [BRIEF_OUTPUT_SCHEMA, CRITIQUE_OUTPUT_SCHEMA, SYNTHESIS_OUTPUT_SCHEMA]) expect(() => { assertObjectJsonSchema(schema); }).not.toThrow();
  });
  it("limits brief criteria and questions", () => {
    const brief = { objective: "Decide", acceptanceCriteria: ["Has baseline"], constraints: [], clarifyingQuestions: [] };
    expect(parseBriefReport(brief)).toEqual(brief);
    expect(() => parseBriefReport({ ...brief, acceptanceCriteria: [] })).toThrow(/1-8/);
    expect(() => parseBriefReport({ ...brief, clarifyingQuestions: ["?", "?", "?", "?", "?", "?"] })).toThrow(/0-5/);
  });
  it("only lets critiques target supplied reports and evidence", () => {
    const item = { targetStageId: "analysis-beta-1", issue: "No control", kind: "missing", evidenceIds: ["ref-1"] };
    expect(parseCritiqueReport({ summary: "s", items: [item] }, ev, inputs).items).toHaveLength(1);
    expect(() => parseCritiqueReport({ summary: "s", items: [{ ...item, targetStageId: "analysis-gamma-1" }] }, ev, inputs)).toThrow(/target/);
    expect(() => parseCritiqueReport({ summary: "s", items: [{ ...item, evidenceIds: ["nope"] }] }, ev, inputs)).toThrow(/not supplied/);
  });
  it("validates synthesis disagreements and missing stages", () => {
    expect(parseSynthesisReport(synthesis(), ev, inputs, [])).toEqual(synthesis());
    const [d] = synthesis().disagreements;
    expect(() => parseSynthesisReport(synthesis({ disagreements: [{ ...d!, positions: d!.positions.slice(0, 1) }] }), ev, inputs, [])).toThrow(/2 positions/);
    const { test: _test, ...noTest } = d!;
    expect(() => parseSynthesisReport(synthesis({ disagreements: [noTest] }), ev, inputs, [])).toThrow(/test/);
    expect(() => parseSynthesisReport(synthesis({ disagreements: [{ ...d!, positions: [d!.positions[0]!, { stageId: "x", position: "y" }] }] }), ev, inputs, [])).toThrow(/stage/);
    expect(() => parseSynthesisReport(synthesis(), ev, inputs, ["analysis-gamma"])).toThrow(/missingStages/);
    expect(() => parseSynthesisReport(synthesis({ findings: [{ claim: "c", kind: "observation", evidenceIds: ["nope"] }] }), ev, inputs, [])).toThrow(/not supplied/);
  });
});
