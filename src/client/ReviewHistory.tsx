import { useEffect, useState, type ReactNode } from "react";
import type { TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import {
  Button,
  IconDownloadOutlineRegular,
  IconRefreshOutlineRegular,
  MarkdownText,
  Modal,
  StateDot,
  type StateDotState,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReviewRun, ReviewSummary } from "../expert-types.js";
import type { ExpertWorkbenchApi } from "./ExpertWorkbench.js";
import { errorText } from "./controls.js";
import css from "./settings.module.css";

const STATUS_KEYS = {
  open: "reviewOpen",
  running: "reviewRunning",
  completed: "reviewCompleted",
  partial: "reviewPartial",
  failed: "reviewFailed",
  cancelled: "reviewCancelled",
  "timed-out": "reviewTimedOut",
  expired: "reviewExpired",
} as const satisfies Record<ReviewSummary["status"], string>;

const STATUS_DOTS = {
  open: "ongoing",
  running: "ongoing",
  completed: "done",
  partial: "warning",
  failed: "error",
  cancelled: "idle",
  "timed-out": "warning",
  expired: "idle",
} as const satisfies Record<ReviewSummary["status"], StateDotState>;

const POLL_MS = 2_000;

type Report = { run: ReviewRun; markdown: string };

/**
 * List past plan reviews, poll while any is running, and open or export reports.
 * @returns The review history block.
 */
export function ReviewHistory({
  api,
  t,
}: {
  api: Pick<ExpertWorkbenchApi, "listReviews" | "readReview" | "cancelReview">;
  t: TranslateNS<"digital-life">;
}): ReactNode {
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [report, setReport] = useState<Report | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const hasRunning = reviews.some((run) => run.status === "running");

  useEffect(() => {
    let mounted = true;
    const refresh = (): void => {
      void api
        .listReviews()
        .then((value) => {
          if (mounted) setReviews(value);
        })
        .catch((reason: unknown) => {
          if (mounted) setError(errorText(reason));
        });
    };
    refresh();
    const timer = hasRunning ? setInterval(refresh, POLL_MS) : undefined;
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [api, hasRunning]);

  const perform = (action: () => Promise<void>): void => {
    setBusy(true);
    setError(undefined);
    void action()
      .catch((reason: unknown) => {
        setError(errorText(reason));
      })
      .finally(() => {
        setBusy(false);
      });
  };
  const download = (kind: "md" | "json"): void => {
    if (report === undefined) return;
    const blob = new Blob([kind === "md" ? report.markdown : JSON.stringify(report.run, null, 2)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.run.id}.${kind}`;
    anchor.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1_000);
  };

  return (
    <section className={css.block} aria-labelledby="digital-life-history-title">
      <div className={css.blockHead}>
        <h3 id="digital-life-history-title">{t("reviewHistory")}</h3>
        <Button
          size="sm"
          icon={<IconRefreshOutlineRegular size={14} />}
          disabled={busy}
          onClick={() => {
            perform(async () => {
              setReviews(await api.listReviews());
            });
          }}
        >
          {t("refreshReviews")}
        </Button>
      </div>
      {error === undefined ? null : (
        <p className={css.error} role="alert">
          {error}
        </p>
      )}
      {reviews.length === 0 ? (
        <p className={css.muted}>{t("noReviews")}</p>
      ) : (
        <div>
          {reviews.map((run) => (
            <div className={css.reviewRow} key={run.id}>
              <StateDot state={STATUS_DOTS[run.status]} />
              <div className={css.reviewMain}>
                <span title={run.question}>{run.question}</span>
                <small>
                  {t(STATUS_KEYS[run.status])} · {new Date(run.createdAt).toLocaleString()}
                </small>
              </div>
              {run.status === "running" ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    perform(async () => {
                      await api.cancelReview(run.id);
                      setReviews(await api.listReviews());
                    });
                  }}
                >
                  {t("cancelReview")}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  perform(async () => {
                    setReport(await api.readReview(run.id));
                  });
                }}
              >
                {t("openReport")}
              </Button>
            </div>
          ))}
        </div>
      )}
      {report === undefined ? null : (
        <Modal
          open
          onClose={() => {
            setReport(undefined);
          }}
          title={t("reportTitle")}
          description={report.run.request.question}
          closeLabel={t("close")}
          className={css.dialog ?? ""}
          contentClassName={css.dialogContent ?? ""}
          footer={
            <>
              <Button
                variant="outline"
                icon={<IconDownloadOutlineRegular size={16} />}
                onClick={() => {
                  download("md");
                }}
              >
                {t("exportReviewMarkdown")}
              </Button>
              <Button
                variant="outline"
                icon={<IconDownloadOutlineRegular size={16} />}
                onClick={() => {
                  download("json");
                }}
              >
                {t("exportReviewJson")}
              </Button>
            </>
          }
        >
          <MarkdownText
            text={report.markdown}
            labels={{ code: { copyLabel: t("copyCode"), copiedLabel: t("copiedCode") }, footnotes: t("footnotes") }}
          />
        </Modal>
      )}
    </section>
  );
}
