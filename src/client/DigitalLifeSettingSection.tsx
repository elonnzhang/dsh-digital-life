import { useMemo, useRef, useState, type ReactNode } from "react";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type { SettingsScope, SettingsScopeSnapshot } from "@deepseek-ai/dsh-client-runtime/client";
import type { DigitalLifeCategory, DigitalLifeRecord, DigitalLifeSettings } from "../types.js";
import css from "./DigitalLifeSettingSection.module.css";

/**
 * Resolve the identity source stored for an editor draft.
 * @param draft Record entered in the settings editor.
 * @returns A record bound to either its managed Markdown file or an external Agent file.
 */
export function normalizeDigitalLifeRecord(draft: DigitalLifeRecord): DigitalLifeRecord {
  const agent = draft.agent?.trim() ?? "";
  const id = draft.id.trim();
  const managedBinding = `${id}/agents/${id}.md`;
  const managed = agent === "" || agent === managedBinding;
  return {
    ...draft,
    id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    customCategory: draft.customCategory?.trim() || undefined,
    tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
    agent: managed ? managedBinding : agent,
    persona: managed ? draft.persona.trim() : "",
  };
}

/** Settings scope and reactive source injected into the settings section. */
export interface DigitalLifeSettingSectionInjected {
  hooks: {
    settings: {
      getSnapshot(): SettingsScopeSnapshot<DigitalLifeSettings>;
      subscribe(listener: () => void): () => void;
    };
  };
  scope: SettingsScope<DigitalLifeSettings>;
  loadIdentity: (id: string) => Promise<string>;
}

type Props = PropsRuntime<"settings.section"> & {
  useSettings: <T>(selector: (snapshot: SettingsScopeSnapshot<DigitalLifeSettings>) => T) => T;
} & Omit<DigitalLifeSettingSectionInjected, "hooks">;

// digital life status
const EMPTY_RECORD: DigitalLifeRecord = {
  id: "",
  name: "",
  description: "",
  category: "business",
  customCategory: "",
  tags: [],
  persona: "",
  enabled: true,
};

/** Render the persisted digital-life settings editor. */
export function DigitalLifeSettingSection(props: Props): ReactNode {
  const snapshot = props.useSettings((value) => value);
  const [draft, setDraft] = useState<DigitalLifeRecord | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const settings = snapshot.value;
  const records = (settings?.records ?? []).map((record) => ({
    ...record,
    description: record.description?.trim() || record.name,
    tags: record.tags ?? (record.tag?.trim() ? [record.tag.trim()] : []),
  }));
  const provider = settings?.provider ?? "spawn";
  const maxBatchSize = settings?.maxBatchSize ?? 3;
  const ids = useMemo(() => new Set(records.map((record) => record.id)), [records]);

  if (snapshot.status === "loading")
    return (
      <section className={css.section}>
        <p>正在加载数字生命配置…</p>
      </section>
    );
  if (snapshot.status !== "ready" || settings === undefined) {
    return (
      <section className={css.section}>
        <h2>数字生命</h2>
        <p className={css.notice}>当前 Host 未暴露 digital-life 配置。</p>
      </section>
    );
  }

  const beginAdd = (): void => {
    setEditingId(undefined);
    setDraft({ ...EMPTY_RECORD });
    setInvalidFields(new Set());
    setMessage(undefined);
  };
  const beginEdit = (record: DigitalLifeRecord): void => {
    setEditingId(record.id);
    setDraft(undefined);
    setMessage("正在读取人格文件…");
    void props
      .loadIdentity(record.id)
      .then((identity) => {
        setDraft({
          ...record,
          persona: identity,
          toolFilter: record.toolFilter === undefined ? undefined : [...record.toolFilter],
        });
        setInvalidFields(new Set());
        setMessage(undefined);
      })
      .catch((error) => {
        setEditingId(undefined);
        setMessage(error instanceof Error ? error.message : String(error));
      });
  };
  const save = (): void => {
    if (draft === undefined) return;
    const id = draft.id.trim();
    const missing = new Set<string>();
    if (id === "") missing.add("id");
    if (draft.name.trim() === "") missing.add("name");
    if (draft.description.trim() === "") missing.add("description");
    if (draft.category === "custom" && draft.description.trim().length < 2) missing.add("description");
    if (draft.tags.some((tag) => tag.trim() === "")) missing.add("tags");
    if (draft.category === "custom" && (draft.customCategory?.trim().length ?? 0) < 2) missing.add("customCategory");
    // A record must either provide inline identity text or an explicit Host
    // agent path. A browser-selected file is imported into `persona` below;
    // it must not be sent back as a filename that the Host cannot read.
    if (draft.persona.trim() === "" && (draft.agent?.trim() ?? "") === "") missing.add("persona");
    setInvalidFields(missing);
    if (missing.size > 0) {
      setMessage("请填写标红的必填字段。");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      setMessage("ID 只能包含小写字母、数字和连字符。");
      setInvalidFields(new Set(["id"]));
      return;
    }
    if (editingId !== id && ids.has(id)) {
      setMessage("该 ID 已存在。");
      setInvalidFields(new Set(["id"]));
      return;
    }
    const next = normalizeDigitalLifeRecord(draft);
    const nextRecords =
      editingId === undefined ? [...records, next] : records.map((record) => (record.id === editingId ? next : record));
    void props.scope
      .set("records", nextRecords)
      .then(() => {
        // SettingsScope publishes the refreshed snapshot asynchronously after
        // the wire write. Do not inspect the old snapshot here: it can still
        // contain the pre-save records even when the write succeeded.
        setDraft(undefined);
        setEditingId(undefined);
        setMessage("已保存，Agent 人格文件已同步");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : String(error));
      });
  };
  const remove = (id: string): void => {
    void props.scope
      .set(
        "records",
        records.filter((record) => record.id !== id),
      )
      .then(() => {
        setMessage("已删除");
      });
  };

  return (
    <section className={css.section}>
      <header className={css.header}>
        <div>
          <h2>数字生命</h2>
          <p>创建可由主代理通过工具咨询的人格代理，也可在输入框中使用 @id。</p>
        </div>
        <button className={css.primary} type="button" onClick={beginAdd} disabled={!snapshot.writable}>
          新增数字生命
        </button>
      </header>
      <div className={css.runtime}>
        <label className={css.wide}>
          插件数据目录（stateDir）
          <input
            value={settings.stateDir ?? ""}
            onChange={(event) => {
              void props.scope.set("stateDir", event.target.value);
            }}
            placeholder="默认 ~/.dsh/digital-life/"
            disabled={!snapshot.writable}
          />
        </label>
        <label>
          子代理 Provider
          <input
            value={provider}
            onChange={(event) => {
              void props.scope.set("provider", event.target.value);
            }}
            disabled={!snapshot.writable}
          />
        </label>
        <label>
          分类最大咨询数
          <input
            type="number"
            min={1}
            max={20}
            value={maxBatchSize}
            onChange={(event) => {
              void props.scope.set("maxBatchSize", Number(event.target.value));
            }}
            disabled={!snapshot.writable}
          />
        </label>
      </div>
      {message === undefined ? null : <p className={css.notice}>{message}</p>}
      <div className={css.cards}>
        {records.length === 0 ? (
          <div className={css.empty}>尚未配置数字生命</div>
        ) : (
          records.map((record) => (
            <article className={css.card} key={record.id}>
              <div className={css.cardMain}>
                <div className={css.identity}>
                  <strong>{record.name}</strong>
                  <span>{record.category === "custom" ? record.customCategory : record.category}</span>
                  <code className={css.recordId}>@{record.id}</code>
                </div>
                <div className={css.tagRow} title={record.tags.join(" · ")}>
                  {record.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <p className={css.preview}>{record.description}</p>
              </div>
              <div className={css.actions}>
                <label className={css.toggle}>
                  <input
                    type="checkbox"
                    checked={record.enabled}
                    onChange={(event) => {
                      void props.scope.set(
                        "records",
                        records.map((item) =>
                          item.id === record.id ? { ...item, enabled: event.target.checked } : item,
                        ),
                      );
                    }}
                  />
                  启用
                </label>
                <button
                  type="button"
                  onClick={() => {
                    beginEdit(record);
                  }}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className={css.danger}
                  onClick={() => {
                    remove(record.id);
                  }}
                >
                  删除
                </button>
              </div>
            </article>
          ))
        )}
      </div>
      {draft === undefined ? null : (
        <Editor
          draft={draft}
          existing={editingId !== undefined}
          setDraft={setDraft}
          invalidFields={invalidFields}
          clearInvalidField={(field) => {
            setInvalidFields((current) => {
              const next = new Set(current);
              next.delete(field);
              return next;
            });
          }}
          onSave={save}
          onCancel={() => {
            setDraft(undefined);
            setEditingId(undefined);
          }}
        />
      )}
    </section>
  );
}

function parseAgentMetadata(frontmatter: string): {
  id?: string;
  name?: string;
  customCategory?: string;
} {
  const values: { id?: string; name?: string; customCategory?: string } = {};
  for (const line of frontmatter.split("\n")) {
    const match = /^(id|name|description):\s*["']?(.+?)["']?\s*$/.exec(line.trim());
    if (match === null) continue;
    const value = match[2].trim();
    if (match[1] === "id") values.id = value;
    // The canonical file uses `name` for the stable record id and stores the
    // display name/tag in description: "名称（标签）".
    if (match[1] === "name" && values.id === undefined) values.id = value;
    if (match[1] === "description" && values.name === undefined) values.name = value;
  }
  return values;
}

function Editor({
  draft,
  existing,
  setDraft,
  invalidFields,
  clearInvalidField,
  onSave,
  onCancel,
}: {
  draft: DigitalLifeRecord;
  existing: boolean;
  setDraft: (value: DigitalLifeRecord) => void;
  invalidFields: Set<string>;
  clearInvalidField: (field: string) => void;
  onSave: () => void;
  onCancel: () => void;
}): ReactNode {
  const update = <K extends keyof DigitalLifeRecord>(key: K, value: DigitalLifeRecord[K]): void => {
    setDraft({ ...draft, [key]: value });
    if (invalidFields.has(String(key))) clearInvalidField(String(key));
  };
  const fileInput = useRef<HTMLInputElement>(null);
  const [boundFile, setBoundFile] = useState<string | undefined>(undefined);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const bindFile = async (file: File): Promise<void> => {
    try {
      const markdown = (await file.text()).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
      const end = markdown.startsWith("---\n") ? markdown.indexOf("\n---\n", 4) : -1;
      const frontmatter = end === -1 ? "" : markdown.slice(4, end);
      const identity = (end === -1 ? markdown : markdown.slice(end + 5)).trim();
      if (identity === "") throw new Error("Agent 文件没有身份正文。");

      // Prefer the Agent frontmatter as the source of truth for metadata. A
      // browser only exposes the filename, not the local absolute path.
      const metadata = parseAgentMetadata(frontmatter);
      const fileId = metadata.id ?? file.name.replace(/\.md$/i, "");
      const id = /^[a-z0-9][a-z0-9-]*$/.test(fileId) ? fileId : draft.id;
      const name = metadata.name ?? draft.name;
      // A browser-selected file cannot be reopened by the Host after the picker closes.
      // Persist the imported identity inline instead of the browser-only filename.
      setDraft({ ...draft, id, name, agent: undefined, persona: identity });
      setBoundFile(file.name);
      setFileError(undefined);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : String(error));
    }
  };
  const managedBinding = `${draft.id}/agents/${draft.id}.md`;
  const externalBinding = draft.agent !== undefined && draft.agent !== managedBinding;
  return (
    <div className={css.backdrop}>
      <div className={css.editor} role="dialog" aria-modal="true" aria-label="编辑数字生命">
        <h3>{existing ? `编辑 ${draft.name || "数字生命"}` : "新增数字生命"}</h3>
        <div className={css.form}>
          <label>
            ID
            <input
              className={invalidFields.has("id") ? css.invalid : undefined}
              value={draft.id}
              onChange={(event) => {
                update("id", event.target.value);
              }}
              placeholder="user-xx"
              disabled={existing}
              readOnly={existing}
            />
          </label>
          <label>
            名字
            <input
              className={invalidFields.has("name") ? css.invalid : undefined}
              value={draft.name}
              onChange={(event) => {
                update("name", event.target.value);
              }}
            />
          </label>
          <label>
            能力标签（逗号分隔）
            <input
              className={invalidFields.has("tags") ? css.invalid : undefined}
              value={draft.tags.join(", ")}
              onChange={(event) => {
                update(
                  "tags",
                  event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                );
              }}
              placeholder="例如：市场研究，结构化，审查"
            />
          </label>
          <label>
            主领域
            <select
              value={draft.category}
              onChange={(event) => {
                update("category", event.target.value as DigitalLifeCategory);
              }}
            >
              <option value="business">企业</option>
              <option value="science">科学</option>
              <option value="tech">技术</option>
              <option value="culture">文化</option>
              <option value="custom">自定义</option>
            </select>
          </label>
          {draft.category === "custom" ? (
            <label>
              自定义主领域
              <input
                className={invalidFields.has("customCategory") ? css.invalid : undefined}
                value={draft.customCategory ?? ""}
                onChange={(event) => update("customCategory", event.target.value)}
                placeholder="例如：战略咨询"
              />
            </label>
          ) : null}
          <label className={css.full}>
            Agent 人格文件
            <span className={css.fileBinding}>
              <input
                value={draft.agent ?? (existing ? `agents/${draft.id}.md` : "")}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  update("agent", value === "" ? undefined : value);
                  setBoundFile(undefined);
                }}
                placeholder="Host 路径，如 ~/.claude/agents/xxx.md"
                disabled={existing}
                readOnly={existing}
              />
              {existing ? null : (
                <button type="button" onClick={() => fileInput.current?.click()}>
                  选择并导入
                </button>
              )}
              <input
                ref={fileInput}
                className={css.hiddenFile}
                type="file"
                accept=".md,text/markdown,text/plain"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file !== undefined) void bindFile(file);
                  event.target.value = "";
                }}
              />
            </span>
            <span className={fileError === undefined ? css.hint : css.fileError}>
              {fileError ??
                (externalBinding
                  ? "外部 Agent 文件是唯一人格来源；插件不会复制或覆盖该文件。"
                  : existing
                    ? "修改人格设定后会同步写回托管 Agent 文件。"
                    : boundFile === undefined
                      ? "填写 Host 文件路径可绑定外部文件；从浏览器选择文件会导入到托管文件。"
                      : `已导入：${boundFile}，保存后写入 ${draft.id || "{id}"}/agents/${draft.id || "{id}"}.md`)}
            </span>
          </label>
          <label className={css.full}>
            描述
            <input
              className={invalidFields.has("description") ? css.invalid : undefined}
              value={draft.description}
              onChange={(event) => {
                update("description", event.target.value);
              }}
              placeholder="例如：擅长创业战略与现金流分析"
            />
          </label>
          <label className={css.full}>
            人格设定 {externalBinding ? "（由 Agent 文件提供，只读）" : existing ? "（修改后同步到 Agent 文件）" : ""}
            <textarea
              className={invalidFields.has("persona") ? css.invalid : undefined}
              rows={8}
              value={draft.persona}
              readOnly={externalBinding}
              onChange={(event) => {
                update("persona", event.target.value);
              }}
            />
          </label>
          <label className={css.full}>
            允许的工具（逗号分隔，留空表示继承）
            <input
              value={draft.toolFilter?.join(", ") ?? ""}
              onChange={(event) => {
                const values = event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean);
                update("toolFilter", values.length === 0 ? undefined : values);
              }}
            />
          </label>
        </div>
        <div className={css.editorActions}>
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button className={css.primary} type="button" onClick={onSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
