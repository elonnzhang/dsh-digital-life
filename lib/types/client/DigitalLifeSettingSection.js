import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from "react";
import css from "./DigitalLifeSettingSection.module.css";
import { categoryLabel } from "./locales.js";
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
    const t = props.t;
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
        return (_jsx("section", { className: css.section, children: _jsx("p", { children: t("loading") }) }));
    if (snapshot.status !== "ready" || settings === undefined) {
        return (_jsxs("section", { className: css.section, children: [_jsx("h2", { children: t("title") }), _jsx("p", { className: css.notice, children: t("unavailable") })] }));
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
        setMessage(t("readingIdentity"));
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
            setMessage(t("required"));
            return;
        }
        if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
            setMessage(t("invalidId"));
            setInvalidFields(new Set(["id"]));
            return;
        }
        if (editingId !== id && ids.has(id)) {
            setMessage(t("duplicateId"));
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
            setMessage(t("saved"));
        })
            .catch((error) => {
            setMessage(error instanceof Error ? error.message : String(error));
        });
    };
    const remove = (id) => {
        void props.scope
            .set("records", records.filter((record) => record.id !== id))
            .then(() => {
            setMessage(t("deleted"));
        });
    };
    return (_jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { children: [_jsx("h2", { children: t("title") }), _jsx("p", { children: t("intro") })] }), _jsx("button", { className: css.primary, type: "button", onClick: beginAdd, disabled: !snapshot.writable, children: t("add") })] }), _jsxs("div", { className: css.runtime, children: [_jsxs("label", { className: css.wide, children: [t("stateDir"), _jsx("input", { value: settings.stateDir ?? "", onChange: (event) => {
                                    void props.scope.set("stateDir", event.target.value);
                                }, placeholder: t("stateDirPlaceholder"), disabled: !snapshot.writable })] }), _jsxs("label", { children: [t("provider"), _jsx("input", { value: provider, onChange: (event) => {
                                    void props.scope.set("provider", event.target.value);
                                }, disabled: !snapshot.writable })] }), _jsxs("label", { children: [t("maxBatchSize"), _jsx("input", { type: "number", min: 1, max: 20, value: maxBatchSize, onChange: (event) => {
                                    void props.scope.set("maxBatchSize", Number(event.target.value));
                                }, disabled: !snapshot.writable })] })] }), message === undefined ? null : _jsx("p", { className: css.notice, children: message }), _jsx("div", { className: css.cards, children: records.length === 0 ? (_jsx("div", { className: css.empty, children: t("empty") })) : (records.map((record) => (_jsxs("article", { className: css.card, children: [_jsxs("div", { className: css.cardMain, children: [_jsxs("div", { className: css.identity, children: [_jsx("strong", { children: record.name }), _jsx("span", { children: categoryLabel(record, t) }), _jsxs("code", { className: css.recordId, children: ["@", record.id] })] }), _jsx("div", { className: css.tagRow, title: record.tags.join(" · "), children: record.tags.map((tag) => (_jsx("span", { children: tag }, tag))) }), _jsx("p", { className: css.preview, children: record.description })] }), _jsxs("div", { className: css.actions, children: [_jsxs("label", { className: css.toggle, children: [_jsx("input", { type: "checkbox", checked: record.enabled, onChange: (event) => {
                                                void props.scope.set("records", records.map((item) => item.id === record.id ? { ...item, enabled: event.target.checked } : item));
                                            } }), t("enabled")] }), _jsx("button", { type: "button", onClick: () => {
                                        beginEdit(record);
                                    }, children: t("edit") }), _jsx("button", { type: "button", className: css.danger, onClick: () => {
                                        remove(record.id);
                                    }, children: t("remove") })] })] }, record.id)))) }), draft === undefined ? null : (_jsx(Editor, { draft: draft, existing: editingId !== undefined, t: t, setDraft: setDraft, invalidFields: invalidFields, clearInvalidField: (field) => {
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
function Editor({ draft, existing, t, setDraft, invalidFields, clearInvalidField, onSave, onCancel, }) {
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
                throw new Error(t("identityError"));
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
    return (_jsx("div", { className: css.backdrop, children: _jsxs("div", { className: css.editor, role: "dialog", "aria-modal": "true", "aria-label": t("dialogEdit"), children: [_jsx("h3", { children: existing ? `${t("edit")} ${draft.name || t("defaultLife")}` : t("dialogAdd") }), _jsxs("div", { className: css.form, children: [_jsxs("label", { children: ["ID", _jsx("input", { className: invalidFields.has("id") ? css.invalid : undefined, value: draft.id, onChange: (event) => {
                                        update("id", event.target.value);
                                    }, placeholder: "user-xx", disabled: existing, readOnly: existing })] }), _jsxs("label", { children: [t("name"), _jsx("input", { className: invalidFields.has("name") ? css.invalid : undefined, value: draft.name, onChange: (event) => {
                                        update("name", event.target.value);
                                    }, placeholder: t("namePlaceholder") })] }), _jsxs("label", { children: [t("tags"), _jsx("input", { className: invalidFields.has("tags") ? css.invalid : undefined, value: draft.tags.join(", "), onChange: (event) => {
                                        update("tags", event.target.value
                                            .split(",")
                                            .map((tag) => tag.trim())
                                            .filter(Boolean));
                                    }, placeholder: t("tagsPlaceholder") })] }), _jsxs("label", { children: [t("category"), _jsxs("select", { value: draft.category, onChange: (event) => {
                                        update("category", event.target.value);
                                    }, children: [_jsx("option", { value: "business", children: t("categoryBusiness") }), _jsx("option", { value: "science", children: t("categoryScience") }), _jsx("option", { value: "tech", children: t("categoryTech") }), _jsx("option", { value: "culture", children: t("categoryCulture") }), _jsx("option", { value: "entertainment", children: t("categoryEntertainment") }), _jsx("option", { value: "custom", children: t("categoryCustom") })] })] }), draft.category === "custom" ? (_jsxs("label", { children: [t("customCategory"), _jsx("input", { className: invalidFields.has("customCategory") ? css.invalid : undefined, value: draft.customCategory ?? "", onChange: (event) => update("customCategory", event.target.value), placeholder: t("customCategoryPlaceholder") })] })) : null, _jsxs("label", { className: css.full, children: [t("agent"), _jsxs("span", { className: css.fileBinding, children: [_jsx("input", { value: draft.agent ?? (existing ? `agents/${draft.id}.md` : ""), onChange: (event) => {
                                                const value = event.target.value.trim();
                                                update("agent", value === "" ? undefined : value);
                                                setBoundFile(undefined);
                                            }, placeholder: t("agentPlaceholder"), disabled: existing, readOnly: existing }), existing ? null : (_jsx("button", { type: "button", onClick: () => fileInput.current?.click(), children: t("importFile") })), _jsx("input", { ref: fileInput, className: css.hiddenFile, type: "file", accept: ".md,text/markdown,text/plain", onChange: (event) => {
                                                const file = event.target.files?.[0];
                                                if (file !== undefined)
                                                    void bindFile(file);
                                                event.target.value = "";
                                            } })] }), _jsx("span", { className: fileError === undefined ? css.hint : css.fileError, children: fileError ??
                                        (externalBinding
                                            ? t("externalHint")
                                            : existing
                                                ? t("managedExistingHint")
                                                : boundFile === undefined
                                                    ? t("managedNewHint")
                                                    : t("importedHint", {
                                                        file: boundFile,
                                                        path: `${draft.id || "{id}"}/agents/${draft.id || "{id}"}.md`,
                                                    })) })] }), _jsxs("label", { className: css.full, children: [t("description"), _jsx("input", { className: invalidFields.has("description") ? css.invalid : undefined, value: draft.description, onChange: (event) => {
                                        update("description", event.target.value);
                                    }, placeholder: t("descriptionPlaceholder") })] }), _jsxs("label", { className: css.full, children: [t("persona"), " ", externalBinding ? t("personaExternal") : existing ? t("personaManaged") : "", _jsx("textarea", { className: invalidFields.has("persona") ? css.invalid : undefined, rows: 8, value: draft.persona, readOnly: externalBinding, onChange: (event) => {
                                        update("persona", event.target.value);
                                    } })] }), _jsxs("label", { className: css.full, children: [t("tools"), _jsx("input", { value: draft.toolFilter?.join(", ") ?? "", onChange: (event) => {
                                        const values = event.target.value
                                            .split(",")
                                            .map((value) => value.trim())
                                            .filter(Boolean);
                                        update("toolFilter", values.length === 0 ? undefined : values);
                                    } })] })] }), _jsxs("div", { className: css.editorActions, children: [_jsx("button", { type: "button", onClick: onCancel, children: t("cancel") }), _jsx("button", { className: css.primary, type: "button", onClick: onSave, children: t("save") })] })] }) }));
}
