import type {
  BriefReport,
  CritiqueReport,
  DisagreementType,
  ReviewReport,
  SynthesisReport,
  TeamMember,
  TeamRun,
  TeamStage,
  TeamStageKind,
} from "../expert-types.js";

const STAGE_ORDER: readonly TeamStageKind[] = ["brief", "analysis", "cross-critique", "review", "synthesis"];
const DISAGREEMENT_ORDER: readonly DisagreementType[] = ["fact", "assumption", "applicability", "value"];

/** One member's latest attempt at a stage kind. */
export interface StageNode {
  stage: TeamStage;
  member: TeamMember | undefined;
  /** Attempts by this member at this stage kind, including the latest. */
  attempts: number;
  durationMs: number;
}

export interface StageColumn {
  kind: TeamStageKind;
  nodes: StageNode[];
}

/** Format milliseconds as m:ss; mirrors the Host renderer so the two views agree. */
export function clock(ms: number): string {
  const seconds = Math.floor(ms / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Build the task graph: one column per stage kind, one node per member holding their latest attempt.
 * @param now Clock used for the elapsed time of running stages.
 */
export function stageColumns(run: TeamRun, now = Date.now()): StageColumn[] {
  const members = new Map(run.members.map((member) => [member.id, member]));
  return STAGE_ORDER.map((kind) => {
    const latest = new Map<string, StageNode>();
    for (const stage of run.stages) {
      if (stage.kind !== kind) continue;
      const end = stage.finishedAt === undefined ? now : Date.parse(stage.finishedAt);
      latest.set(stage.expertId, {
        stage,
        member: members.get(stage.expertId),
        attempts: (latest.get(stage.expertId)?.attempts ?? 0) + 1,
        durationMs: Math.max(0, end - Date.parse(stage.startedAt)),
      });
    }
    return { kind, nodes: [...latest.values()] };
  });
}

/** Group synthesis disagreements by type, in fact → assumption → applicability → value order. */
export function groupDisagreements(report: SynthesisReport): Array<{ type: DisagreementType; items: SynthesisReport["disagreements"] }> {
  return DISAGREEMENT_ORDER
    .map((type) => ({ type, items: report.disagreements.filter((item) => item.type === type) }))
    .filter((group) => group.items.length > 0);
}

/** Budget usage as display fragments, e.g. calls "6/10" and time "3:12/10:00". */
export function budgetUsage(run: TeamRun): { calls: string; time: string } {
  const { callsUsed, maxCalls, activeMs, maxActiveMs } = run.budget;
  return { calls: `${callsUsed}/${maxCalls}`, time: `${clock(activeMs)}/${clock(maxActiveMs)}` };
}

/** The most recent completed synthesis report, if any. */
export function latestSynthesis(run: TeamRun): SynthesisReport | undefined {
  const stage = run.stages.findLast((item) => item.kind === "synthesis" && item.status === "completed");
  return stage?.report as SynthesisReport | undefined;
}

const bullets = (items: readonly string[]): string[] => items.map((item) => `- ${item}`);

/** Markdown lines for the expanded node; empty when the stage has no report. */
export function stageLines(stage: TeamStage): string[] {
  const report = stage.report;
  if (report === undefined) return [];
  if (stage.kind === "brief") {
    const brief = report as BriefReport;
    return [brief.objective, ...bullets(brief.acceptanceCriteria), ...bullets(brief.constraints), ...bullets(brief.clarifyingQuestions)];
  }
  if (stage.kind === "cross-critique") {
    const critique = report as CritiqueReport;
    return [critique.summary, ...critique.items.map((item) => `- [${item.kind}] ${item.targetStageId}: ${item.issue}`)];
  }
  const review = report as ReviewReport | SynthesisReport;
  const lines = [
    review.summary,
    ...review.findings.map((finding) => `- [${finding.kind}] ${finding.claim}`),
    ...bullets(review.assumptions),
    ...bullets(review.nextActions),
  ];
  if (stage.kind !== "synthesis") return [...lines, ...bullets((review as ReviewReport).disagreements)];
  const synthesis = review as SynthesisReport;
  return [...lines, ...bullets(synthesis.options.map((option) => `${option.name}: ${option.tradeoffs}`)),
    ...bullets(synthesis.validationPlan.map((item) => `${item.task} -> decides ${item.decides}; stop when ${item.stopCondition}`)),
    ...bullets(synthesis.missingStages)];
}
