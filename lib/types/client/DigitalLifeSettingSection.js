import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from "react";
import css from "./DigitalLifeSettingSection.module.css";
/**
 * Resolve the identity source stored for an editor draft.
 * @param draft Record entered in the settings editor.
 * @returns A record bound to either its managed Markdown file or an external Agent file.
 */
export function normalizeDigitalLifeRecord(draft) {
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
// digital life status
const EMPTY_RECORD = {
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
export function DigitalLifeSettingSection(props) {
    const snapshot = props.useSettings((value) => value);
    const [draft, setDraft] = useState(undefined);
    const [editingId, setEditingId] = useState(undefined);
    const [message, setMessage] = useState(undefined);
    const [invalidFields, setInvalidFields] = useState(new Set());
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
        return (_jsx("section", { className: css.section, children: _jsx("p", { children: "\u6B63\u5728\u52A0\u8F7D\u6570\u5B57\u751F\u547D\u914D\u7F6E\u2026" }) }));
    if (snapshot.status !== "ready" || settings === undefined) {
        return (_jsxs("section", { className: css.section, children: [_jsx("h2", { children: "\u6570\u5B57\u751F\u547D" }), _jsx("p", { className: css.notice, children: "\u5F53\u524D Host \u672A\u66B4\u9732 digital-life \u914D\u7F6E\u3002" })] }));
    }
    const beginAdd = () => {
        setEditingId(undefined);
        setDraft({ ...EMPTY_RECORD });
        setInvalidFields(new Set());
        setMessage(undefined);
    };
    const beginEdit = (record) => {
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
    const save = () => {
        if (draft === undefined)
            return;
        const id = draft.id.trim();
        const missing = new Set();
        if (id === "")
            missing.add("id");
        if (draft.name.trim() === "")
            missing.add("name");
        if (draft.description.trim() === "")
            missing.add("description");
        if (draft.category === "custom" && draft.description.trim().length < 2)
            missing.add("description");
        if (draft.tags.some((tag) => tag.trim() === ""))
            missing.add("tags");
        if (draft.category === "custom" && (draft.customCategory?.trim().length ?? 0) < 2)
            missing.add("customCategory");
        // A record must either provide inline identity text or an explicit Host
        // agent path. A browser-selected file is imported into `persona` below;
        // it must not be sent back as a filename that the Host cannot read.
        if (draft.persona.trim() === "" && (draft.agent?.trim() ?? "") === "")
            missing.add("persona");
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
        const nextRecords = editingId === undefined ? [...records, next] : records.map((record) => (record.id === editingId ? next : record));
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
    const remove = (id) => {
        void props.scope
            .set("records", records.filter((record) => record.id !== id))
            .then(() => {
            setMessage("已删除");
        });
    };
    return (_jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { children: [_jsx("h2", { children: "\u6570\u5B57\u751F\u547D" }), _jsx("p", { children: "\u521B\u5EFA\u53EF\u7531\u4E3B\u4EE3\u7406\u901A\u8FC7\u5DE5\u5177\u54A8\u8BE2\u7684\u4EBA\u683C\u4EE3\u7406\uFF0C\u4E5F\u53EF\u5728\u8F93\u5165\u6846\u4E2D\u4F7F\u7528 @id\u3002" })] }), _jsx("button", { className: css.primary, type: "button", onClick: beginAdd, disabled: !snapshot.writable, children: "\u65B0\u589E\u6570\u5B57\u751F\u547D" })] }), _jsxs("div", { className: css.runtime, children: [_jsxs("label", { className: css.wide, children: ["\u63D2\u4EF6\u6570\u636E\u76EE\u5F55\uFF08stateDir\uFF09", _jsx("input", { value: settings.stateDir ?? "", onChange: (event) => {
                                    void props.scope.set("stateDir", event.target.value);
                                }, placeholder: "\u9ED8\u8BA4 ~/.dsh/digital-life/", disabled: !snapshot.writable })] }), _jsxs("label", { children: ["\u5B50\u4EE3\u7406 Provider", _jsx("input", { value: provider, onChange: (event) => {
                                    void props.scope.set("provider", event.target.value);
                                }, disabled: !snapshot.writable })] }), _jsxs("label", { children: ["\u5206\u7C7B\u6700\u5927\u54A8\u8BE2\u6570", _jsx("input", { type: "number", min: 1, max: 20, value: maxBatchSize, onChange: (event) => {
                                    void props.scope.set("maxBatchSize", Number(event.target.value));
                                }, disabled: !snapshot.writable })] })] }), message === undefined ? null : _jsx("p", { className: css.notice, children: message }), _jsx("div", { className: css.cards, children: records.length === 0 ? (_jsx("div", { className: css.empty, children: "\u5C1A\u672A\u914D\u7F6E\u6570\u5B57\u751F\u547D" })) : (records.map((record) => (_jsxs("article", { className: css.card, children: [_jsxs("div", { className: css.cardMain, children: [_jsxs("div", { className: css.identity, children: [_jsx("strong", { children: record.name }), _jsx("span", { children: record.category === "custom" ? record.customCategory : record.category }), _jsxs("code", { className: css.recordId, children: ["@", record.id] })] }), _jsx("div", { className: css.tagRow, title: record.tags.join(" · "), children: record.tags.map((tag) => (_jsx("span", { children: tag }, tag))) }), _jsx("p", { className: css.preview, children: record.description })] }), _jsxs("div", { className: css.actions, children: [_jsxs("label", { className: css.toggle, children: [_jsx("input", { type: "checkbox", checked: record.enabled, onChange: (event) => {
                                                void props.scope.set("records", records.map((item) => item.id === record.id ? { ...item, enabled: event.target.checked } : item));
                                            } }), "\u542F\u7528"] }), _jsx("button", { type: "button", onClick: () => {
                                        beginEdit(record);
                                    }, children: "\u7F16\u8F91" }), _jsx("button", { type: "button", className: css.danger, onClick: () => {
                                        remove(record.id);
                                    }, children: "\u5220\u9664" })] })] }, record.id)))) }), draft === undefined ? null : (_jsx(Editor, { draft: draft, existing: editingId !== undefined, setDraft: setDraft, invalidFields: invalidFields, clearInvalidField: (field) => {
                    setInvalidFields((current) => {
                        const next = new Set(current);
                        next.delete(field);
                        return next;
                    });
                }, onSave: save, onCancel: () => {
                    setDraft(undefined);
                    setEditingId(undefined);
                } }))] }));
}
function parseAgentMetadata(frontmatter) {
    const values = {};
    for (const line of frontmatter.split("\n")) {
        const match = /^(id|name|description):\s*["']?(.+?)["']?\s*$/.exec(line.trim());
        if (match === null)
            continue;
        const value = match[2].trim();
        if (match[1] === "id")
            values.id = value;
        // The canonical file uses `name` for the stable record id and stores the
        // display name/tag in description: "名称（标签）".
        if (match[1] === "name" && values.id === undefined)
            values.id = value;
        if (match[1] === "description" && values.name === undefined)
            values.name = value;
    }
    return values;
}
function Editor({ draft, existing, setDraft, invalidFields, clearInvalidField, onSave, onCancel, }) {
    const update = (key, value) => {
        setDraft({ ...draft, [key]: value });
        if (invalidFields.has(String(key)))
            clearInvalidField(String(key));
    };
    const fileInput = useRef(null);
    const [boundFile, setBoundFile] = useState(undefined);
    const [fileError, setFileError] = useState(undefined);
    const bindFile = async (file) => {
        try {
            const markdown = (await file.text()).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
            const end = markdown.startsWith("---\n") ? markdown.indexOf("\n---\n", 4) : -1;
            const frontmatter = end === -1 ? "" : markdown.slice(4, end);
            const identity = (end === -1 ? markdown : markdown.slice(end + 5)).trim();
            if (identity === "")
                throw new Error("Agent 文件没有身份正文。");
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
        }
        catch (error) {
            setFileError(error instanceof Error ? error.message : String(error));
        }
    };
    const managedBinding = `${draft.id}/agents/${draft.id}.md`;
    const externalBinding = draft.agent !== undefined && draft.agent !== managedBinding;
    return (_jsx("div", { className: css.backdrop, children: _jsxs("div", { className: css.editor, role: "dialog", "aria-modal": "true", "aria-label": "\u7F16\u8F91\u6570\u5B57\u751F\u547D", children: [_jsx("h3", { children: existing ? `编辑 ${draft.name || "数字生命"}` : "新增数字生命" }), _jsxs("div", { className: css.form, children: [_jsxs("label", { children: ["ID", _jsx("input", { className: invalidFields.has("id") ? css.invalid : undefined, value: draft.id, onChange: (event) => {
                                        update("id", event.target.value);
                                    }, placeholder: "user-xx", disabled: existing, readOnly: existing })] }), _jsxs("label", { children: ["\u540D\u5B57", _jsx("input", { className: invalidFields.has("name") ? css.invalid : undefined, value: draft.name, onChange: (event) => {
                                        update("name", event.target.value);
                                    } })] }), _jsxs("label", { children: ["\u80FD\u529B\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF09", _jsx("input", { className: invalidFields.has("tags") ? css.invalid : undefined, value: draft.tags.join(", "), onChange: (event) => {
                                        update("tags", event.target.value
                                            .split(",")
                                            .map((tag) => tag.trim())
                                            .filter(Boolean));
                                    }, placeholder: "\u4F8B\u5982\uFF1A\u5E02\u573A\u7814\u7A76\uFF0C\u7ED3\u6784\u5316\uFF0C\u5BA1\u67E5" })] }), _jsxs("label", { children: ["\u4E3B\u9886\u57DF", _jsxs("select", { value: draft.category, onChange: (event) => {
                                        update("category", event.target.value);
                                    }, children: [_jsx("option", { value: "business", children: "\u4F01\u4E1A" }), _jsx("option", { value: "science", children: "\u79D1\u5B66" }), _jsx("option", { value: "tech", children: "\u6280\u672F" }), _jsx("option", { value: "culture", children: "\u6587\u5316" }), _jsx("option", { value: "custom", children: "\u81EA\u5B9A\u4E49" })] })] }), draft.category === "custom" ? (_jsxs("label", { children: ["\u81EA\u5B9A\u4E49\u4E3B\u9886\u57DF", _jsx("input", { className: invalidFields.has("customCategory") ? css.invalid : undefined, value: draft.customCategory ?? "", onChange: (event) => update("customCategory", event.target.value), placeholder: "\u4F8B\u5982\uFF1A\u6218\u7565\u54A8\u8BE2" })] })) : null, _jsxs("label", { className: css.full, children: ["Agent \u4EBA\u683C\u6587\u4EF6", _jsxs("span", { className: css.fileBinding, children: [_jsx("input", { value: draft.agent ?? (existing ? `agents/${draft.id}.md` : ""), onChange: (event) => {
                                                const value = event.target.value.trim();
                                                update("agent", value === "" ? undefined : value);
                                                setBoundFile(undefined);
                                            }, placeholder: "Host \u8DEF\u5F84\uFF0C\u5982 ~/.claude/agents/xxx.md", disabled: existing, readOnly: existing }), existing ? null : (_jsx("button", { type: "button", onClick: () => fileInput.current?.click(), children: "\u9009\u62E9\u5E76\u5BFC\u5165" })), _jsx("input", { ref: fileInput, className: css.hiddenFile, type: "file", accept: ".md,text/markdown,text/plain", onChange: (event) => {
                                                const file = event.target.files?.[0];
                                                if (file !== undefined)
                                                    void bindFile(file);
                                                event.target.value = "";
                                            } })] }), _jsx("span", { className: fileError === undefined ? css.hint : css.fileError, children: fileError ??
                                        (externalBinding
                                            ? "外部 Agent 文件是唯一人格来源；插件不会复制或覆盖该文件。"
                                            : existing
                                                ? "修改人格设定后会同步写回托管 Agent 文件。"
                                                : boundFile === undefined
                                                    ? "填写 Host 文件路径可绑定外部文件；从浏览器选择文件会导入到托管文件。"
                                                    : `已导入：${boundFile}，保存后写入 ${draft.id || "{id}"}/agents/${draft.id || "{id}"}.md`) })] }), _jsxs("label", { className: css.full, children: ["\u63CF\u8FF0", _jsx("input", { className: invalidFields.has("description") ? css.invalid : undefined, value: draft.description, onChange: (event) => {
                                        update("description", event.target.value);
                                    }, placeholder: "\u4F8B\u5982\uFF1A\u64C5\u957F\u521B\u4E1A\u6218\u7565\u4E0E\u73B0\u91D1\u6D41\u5206\u6790" })] }), _jsxs("label", { className: css.full, children: ["\u4EBA\u683C\u8BBE\u5B9A ", externalBinding ? "（由 Agent 文件提供，只读）" : existing ? "（修改后同步到 Agent 文件）" : "", _jsx("textarea", { className: invalidFields.has("persona") ? css.invalid : undefined, rows: 8, value: draft.persona, readOnly: externalBinding, onChange: (event) => {
                                        update("persona", event.target.value);
                                    } })] }), _jsxs("label", { className: css.full, children: ["\u5141\u8BB8\u7684\u5DE5\u5177\uFF08\u9017\u53F7\u5206\u9694\uFF0C\u7559\u7A7A\u8868\u793A\u7EE7\u627F\uFF09", _jsx("input", { value: draft.toolFilter?.join(", ") ?? "", onChange: (event) => {
                                        const values = event.target.value
                                            .split(",")
                                            .map((value) => value.trim())
                                            .filter(Boolean);
                                        update("toolFilter", values.length === 0 ? undefined : values);
                                    } })] })] }), _jsxs("div", { className: css.editorActions, children: [_jsx("button", { type: "button", onClick: onCancel, children: "\u53D6\u6D88" }), _jsx("button", { className: css.primary, type: "button", onClick: onSave, children: "\u4FDD\u5B58" })] })] }) }));
}
