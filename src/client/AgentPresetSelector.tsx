import { useEffect, useState } from "react";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type {} from "@deepseek-ai/dsh-client-ui-conversation/client";
import {
  IconAgentPresetOutline16,
  IconChevronDownOutline14,
  Menu,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { DigitalLifeRecord } from "../types.js";
import css from "./AgentPresetSelector.module.css";

/** Display metadata for one selectable Agent preset. */
export interface AgentPresetOption {
  id: string;
  name: string;
  description?: string;
}

/** Callbacks and records injected by the Client installer. */
export interface AgentPresetSelectorInjected {
  load: () => Promise<{ options: AgentPresetOption[]; current: string }>;
  select: (id: string) => Promise<void>;
  records: () => readonly DigitalLifeRecord[];
  selectLife: (id: string) => Promise<void>;
}

export type AgentPresetSelectorProps =
  PropsRuntime<"conversation.hero.agentPreset"> & AgentPresetSelectorInjected;

/** Render the Harness-styled Agent preset and digital-life selectors. */
export function AgentPresetSelector({
  load,
  select,
  records,
  selectLife,
}: AgentPresetSelectorProps) {
  const [options, setOptions] = useState<AgentPresetOption[]>([]);
  const [current, setCurrent] = useState("");
  const [life, setLife] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  const [lifeOpen, setLifeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load().then((value) => {
      setOptions(value.options);
      setCurrent(value.current);
    });
  }, [load]);

  const chosen = options.find((option) => option.id === current);
  const chosenLife = records().find((record) => record.id === life);
  if (options.length === 0) return null;
  const presetName = chosen?.name ?? current;

  return (
    <div className={css.root}>
      <Menu
        className={`${css.seatWrap} ${css.presetWrap}`}
        open={presetOpen}
        onClose={() => {
          setPresetOpen(false);
        }}
        items={options.map((option) => ({
          id: option.id,
          label: (
            <span className={css.item}>
              <span className={css.itemName}>{option.name}</span>
              <span className={css.itemDesc}>
                {option.description ?? "暂无说明"}
              </span>
            </span>
          ),
        }))}
        selectedId={current}
        onSelect={(id) => {
          setPresetOpen(false);
          setCurrent(id);
          setBusy(true);
          void select(id).finally(() => {
            setBusy(false);
          });
        }}
        align="start"
        portal
        anchor={
          <button
            type="button"
            className={css.seat}
            aria-haspopup="menu"
            aria-expanded={presetOpen}
            title={presetName}
            disabled={busy}
            onClick={() => {
              setPresetOpen((value) => !value);
            }}
          >
            <IconAgentPresetOutline16 className={css.icon} />
            <span className={css.seatLabel}>{presetName}</span>
            <IconChevronDownOutline14 className={css.chevron} />
          </button>
        }
      />
      {current === "digital-life-mode" && (
        <Menu
          className={`${css.seatWrap} ${css.lifeWrap}`}
          open={lifeOpen}
          onClose={() => {
            setLifeOpen(false);
          }}
          items={records().map((record) => ({
            id: record.id,
            label: (
              <span className={css.item}>
                <span className={css.itemName}>{record.name}</span>
                <span className={css.itemDesc}>
                  {record.description} · {record.category === "custom" ? record.customCategory : record.category}
                </span>
              </span>
            ),
          }))}
          selectedId={life}
          onSelect={(id) => {
            setLifeOpen(false);
            setLife(id);
            void selectLife(id);
          }}
          align="start"
          portal
          anchor={
            <button
              type="button"
              className={`${css.seat} ${life === "" ? css.required : ""}`}
              aria-haspopup="menu"
              aria-expanded={lifeOpen}
              title={life === "" ? "请选择一个数字生命" : chosenLife?.name}
              onClick={() => {
                setLifeOpen((value) => !value);
              }}
            >
              <span className={css.lifeIcon}>🧠</span>
              <span className={css.seatLabel}>
                {chosenLife?.name ?? "选择数字生命"}
              </span>
              <IconChevronDownOutline14 className={css.chevron} />
            </button>
          }
        />
      )}
    </div>
  );
}
