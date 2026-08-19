import { useEffect, useRef, useState } from "react";
import type { PropsRuntime, TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import type { SessionId } from "@deepseek-ai/dsh-api-remotes/client";
import type { DigitalLifeRecord } from "../types.js";
import css from "./ChatPanel.module.css";
import { categoryLabel } from "./locales.js";

/** Data and actions supplied by the Host-backed Client installer. */
export interface ChatPanelInjected {
  records: () => readonly DigitalLifeRecord[];
  createSession: (record?: DigitalLifeRecord) => Promise<SessionId>;
  t: TranslateNS<"digital-life">;
}

export type ChatPanelProps = PropsRuntime<"sidebar.footer.action"> & ChatPanelInjected;

export function ChatPanel({ wide, records, createSession, t }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);
  const start = (record?: DigitalLifeRecord): void => {
    setOpen(false);
    void createSession(record).catch((error) => {
      console.error("digital-life: failed to start standalone session", error);
    });
  };
  return (
    <div ref={root} className={css.root}>
      <button
        type="button"
        className={css.trigger}
        aria-label={t("chatAria")}
        aria-expanded={open}
        onClick={() => {
          if (wide) setOpen((value) => !value);
          else start();
        }}
      >
        <span className={css.triggerIcon}>💡</span>
        {wide && (
          <span className={css.triggerText}>
            <strong>{t("chat")}</strong>
            <small>{t("chatDescription")}</small>
          </span>
        )}
        {wide && <span className={css.chevron}>{open ? "⌃" : "⌄"}</span>}
      </button>
      {wide && open && (
        <section className={css.panel} aria-label={t("startSessionAria")}>
          <div className={css.title}>{t("startSession")}</div>
          <button
            type="button"
            className={css.action}
            onClick={() => {
              start();
            }}
          >
            <span className={css.icon}>＋</span>
            <span>{t("newSession")}</span>
          </button>
          {records().map((record) => (
            <button
              key={record.id}
              type="button"
              className={css.action}
              onClick={() => {
                start(record);
              }}
            >
              <span className={css.avatar}>{record.name.slice(0, 1)}</span>
              <span className={css.text}>
                <strong>{record.name}</strong>
                <small>{categoryLabel(record, t)}</small>
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
