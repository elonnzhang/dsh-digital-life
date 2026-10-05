import type { BriefReport, CritiqueReport, ReviewReport, SynthesisReport, TeamRun, TeamStage } from "../expert-types.js";

/** Format milliseconds as m:ss. */
export function clock(ms: number): string {
  const seconds = Math.floor(ms / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
const list = (title: string, items: readonly string[]): string[] => items.length === 0 ? [] : [`### ${title}`, ...items.map((item) => `- ${item}`)];

function body(stage: TeamStage): string[] {
  const report = stage.report;
  if (report === undefined) return [];
  if (stage.kind === "brief") {
    const brief = report as BriefReport;
    return [brief.objective, ...list("Acceptance criteria", brief.acceptanceCriteria), ...list("Constraints", brief.constraints), ...list("Clarifying questions", brief.clarifyingQuestions)];
  }
  if (stage.kind === "cross-critique") {
    const critique = report as CritiqueReport;
    return [critique.summary, ...critique.items.map((item) => `- [${item.kind}] ${item.targetStageId}: ${item.issue} (${item.evidenceIds.join(", ")})`)];
  }
  const review = report as ReviewReport | SynthesisReport;
  const lines = [review.summary, ...review.findings.map((f) => `- [${f.kind}] ${f.claim} (${f.evidenceIds.join(", ")})`), ...list("Assumptions", review.assumptions)];
  if (stage.kind !== "synthesis") return [...lines, ...list("Disagreements", (review as ReviewReport).disagreements), ...list("Next actions", review.nextActions)];
  const synthesis = review as SynthesisReport;
  return [
    ...lines,
    ...list("Disagreements", synthesis.disagreements.map((d) =>
      `[${d.type} / ${d.resolution}] ${d.topic}: ${d.positions.map((p) => `${p.stageId}: ${p.position}`).join("; ")}${d.test === undefined ? "" : ` — test: ${d.test}`}`)),
    ...list("Options", synthesis.options.map((o) => `${o.name}: ${o.tradeoffs}`)),
    ...list("Validation plan", synthesis.validationPlan.map((v) => `${v.task} → decides ${v.decides}; stop when ${v.stopCondition}`)),
    ...list("Next actions", synthesis.nextActions),
    ...list("Missing stages", synthesis.missingStages),
  ];
}

/** Render a v2 run for read_team_run, read_expert_review and export; the latest synthesis comes first. */
export function renderTeamRunMarkdown(run: TeamRun): string {
  const members = new Map(run.members.map((m) => [m.id, m]));
  const synthesis = run.stages.findLast((s) => s.kind === "synthesis" && s.status === "completed");
  const section = (stage: TeamStage): string[] => {
    const member = members.get(stage.expertId);
    return [
      `## ${stage.id} (${member?.name ?? stage.expertId} · ${member?.responsibility ?? ""})`,
      `Status: ${stage.status} · brief v${stage.briefVersion} · inputs: ${stage.inputStageIds.join(", ") || "none"}`,
      ...(stage.error === undefined ? [] : [`Error: ${stage.error}`]),
      ...body(stage),
    ];
  };
  return [
    "# Expert team review",
    `Run: ${run.id}${run.teamId === undefined ? "" : ` · team ${run.teamId}`}`,
    `Status: ${run.status} · Calls ${run.budget.callsUsed}/${run.budget.maxCalls} · Time ${clock(run.budget.activeMs)}/${clock(run.budget.maxActiveMs)} · 调用 ${run.budget.callsUsed}/${run.budget.maxCalls} · 用时 ${clock(run.budget.activeMs)}/${clock(run.budget.maxActiveMs)}`,
    ...(run.error === undefined ? [] : [`Error: ${run.error}`]),
    ...(synthesis === undefined ? [] : section(synthesis)),
    "## Briefs",
    ...run.briefs.map((b) => `### input:brief@${b.version} (${b.source})\n${b.text}`),
    "## Members",
    ...run.members.map((m) => `- ${m.name} @${m.id} — ${m.roles.join("/")} — ${m.responsibility}`),
    ...run.stages.filter((s) => s !== synthesis).flatMap(section),
    "## Supplied evidence",
    "- input:brief@N - User-provided brief (not independently verified).",
    ...run.evidence.map((e) => `- ${e.id}: ${e.sourceUrl}${e.truncated ? " (excerpt truncated)" : ""}`),
  ].join("\n\n");
}
