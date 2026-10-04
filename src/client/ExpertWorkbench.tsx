import { useEffect, useState } from "react";
import type { TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import type { DigitalLifeRecord } from "../types.js";
import { MIMEOGRAPHS_REVISION, type ExpertCatalogEntry, type ReviewRequest, type ReviewRun, type ReviewStatus, type ReviewSummary } from "../expert-types.js";
import css from "./ExpertWorkbench.module.css";

export interface ExpertWorkbenchApi {
  catalog: (revision: string) => Promise<ExpertCatalogEntry[]>;
  importExpert: (slug: string, revision: string) => Promise<string>;
  startReview: (request: ReviewRequest) => Promise<void>;
  listReviews: () => Promise<ReviewSummary[]>;
  readReview: (id: string) => Promise<{ run: ReviewRun; markdown: string }>;
  cancelReview: (id: string) => Promise<void>;
}

export function reviewSubmission(request: ReviewRequest, instruction: string): string {
  return `${instruction}\n\n${JSON.stringify(request, null, 2)}`;
}

const STATUS_KEYS = {
  running: "reviewRunning", completed: "reviewCompleted", partial: "reviewPartial",
  failed: "reviewFailed", cancelled: "reviewCancelled", "timed-out": "reviewTimedOut",
} as const satisfies Record<ReviewStatus, string>;

export function ExpertWorkbench({ api, records, writable, t }: {
  api: ExpertWorkbenchApi;
  records: readonly DigitalLifeRecord[];
  writable: boolean;
  t: TranslateNS<"digital-life">;
}) {
  const [revision, setRevision] = useState(MIMEOGRAPHS_REVISION);
  const [catalog, setCatalog] = useState<ExpertCatalogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [analyst, setAnalyst] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [question, setQuestion] = useState("");
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [report, setReport] = useState<{ run: ReviewRun; markdown: string }>();
  const hasRunning = reviews.some((run) => run.status === "running");
  const enabled = records.filter((record) => record.enabled);
  const chosen = catalog.find((entry) => entry.slug === selected);
  const choices = catalog.filter((entry) => `${entry.name} ${entry.slug} ${entry.description}`.toLowerCase().includes(query.toLowerCase()));
  const perform = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError("");
    setMessage("");
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    let mounted = true;
    const refresh = () => { void api.listReviews().then((value) => { if (mounted) setReviews(value); })
      .catch((error: unknown) => { if (mounted) setError(error instanceof Error ? error.message : String(error)); }); };
    refresh();
    const timer = hasRunning ? setInterval(refresh, 2_000) : undefined;
    return () => { mounted = false; clearInterval(timer); };
  }, [hasRunning]);
  const download = (kind: "md" | "json"): void => {
    if (report === undefined) return;
    const blob = new Blob([kind === "md" ? report.markdown : JSON.stringify(report.run, null, 2)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.run.id}.${kind}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };
  return <div className={css.root}>
    <section className={css.panel} aria-label={t("expertLibrary")}>
      <h3>{t("expertLibrary")}</h3>
      <p>{t("expertLibraryHint")}</p>
      <div className={css.row}>
        <label>{t("expertRevision")}<input value={revision} disabled={busy} spellCheck={false} onChange={(event) => {
          setRevision(event.target.value.trim()); setCatalog([]); setSelected("");
        }} /></label>
        <button type="button" disabled={busy || !/^[a-f0-9]{40}$/.test(revision)} onClick={() => void perform(async () => {
          const entries = await api.catalog(revision);
          setCatalog(entries); setSelected(entries[0]?.slug ?? "");
        })}>{t("loadExpertCatalog")}</button>
      </div>
      {catalog.length > 0 && <>
        <label>{t("searchExperts")}<input value={query} onChange={(event) => { setQuery(event.target.value); setSelected(""); }} /></label>
        <div className={css.row}>
          <label>{t("chooseExpert")}<select value={selected} disabled={busy} onChange={(event) => setSelected(event.target.value)}>
            <option value="">{t("chooseExpert")}</option>
            {choices.map((entry) => <option key={entry.slug} value={entry.slug}>{entry.name}</option>)}
          </select></label>
          <button type="button" disabled={busy || !writable || chosen === undefined} onClick={() => void perform(async () => {
            const id = await api.importExpert(selected, revision);
            setMessage(t("expertImported", { id }));
          })}>{t("importExpert")}</button>
        </div>
        {chosen !== undefined && <p>{chosen.description}</p>}
      </>}
    </section>
    <section className={css.panel} aria-label={t("planReview")}>
      <h3>{t("planReview")}</h3><p>{t("planReviewHint")}</p>
      <div className={css.row}>
        <label>{t("reviewAnalyst")}<select value={analyst} disabled={busy} onChange={(event) => setAnalyst(event.target.value)}>
          <option value="">{t("chooseExpert")}</option>
          {enabled.map((record) => <option key={record.id} value={record.id}>{record.name}</option>)}
        </select></label>
        <label>{t("reviewReviewer")}<select value={reviewer} disabled={busy} onChange={(event) => setReviewer(event.target.value)}>
          <option value="">{t("chooseExpert")}</option>
          {enabled.filter((record) => record.id !== analyst).map((record) => <option key={record.id} value={record.id}>{record.name}</option>)}
        </select></label>
      </div>
      <label>{t("reviewBrief")}<textarea rows={5} maxLength={20_000} value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
      <button type="button" disabled={busy || !enabled.some((record) => record.id === analyst) || !enabled.some((record) => record.id === reviewer) || analyst === reviewer || !question.trim()}
        onClick={() => void perform(async () => {
          await api.startReview({ question: question.trim(), expertIds: [analyst], reviewerId: reviewer });
          setMessage(t("reviewSubmitted"));
        })}>{t("startPlanReview")}</button>
    </section>
    {error && <p className={css.error} role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <section className={css.panel} aria-label={t("reviewHistory")}>
      <div className={css.row}><h3>{t("reviewHistory")}</h3><button type="button" disabled={busy} onClick={() => void perform(async () => setReviews(await api.listReviews()))}>{t("refreshReviews")}</button></div>
      {reviews.length === 0 && <p>{t("noReviews")}</p>}
      {reviews.map((run) => <div key={run.id} className={css.reviewRow}>
        <button type="button" className={css.openReport} disabled={busy} onClick={() => void perform(async () => setReport(await api.readReview(run.id)))}>
          <span>{run.question}</span><small>{t(STATUS_KEYS[run.status])} · {new Date(run.createdAt).toLocaleString()}</small>
        </button>
        {run.status === "running" && <button type="button" disabled={busy} onClick={() => void perform(async () => {
          await api.cancelReview(run.id); setReviews(await api.listReviews());
        })}>{t("cancelReview")}</button>}
      </div>)}
      {report !== undefined && <>
        <div className={css.row}>
          <button type="button" onClick={() => download("md")}>{t("exportReviewMarkdown")}</button>
          <button type="button" onClick={() => download("json")}>{t("exportReviewJson")}</button>
        </div>
        <pre className={css.report}>{report.markdown}</pre>
      </>}
    </section>
  </div>;
}
