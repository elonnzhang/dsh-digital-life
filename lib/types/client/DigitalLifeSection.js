import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import css from './DigitalLifeSection.module.css';
const EMPTY_RECORD = {
    id: '', name: '', tag: '', category: 'custom', persona: '', enabled: true,
};
export function DigitalLifeSection(props) {
    const snapshot = props.useSettings(value => value);
    const [draft, setDraft] = useState(undefined);
    const [editingId, setEditingId] = useState(undefined);
    const [message, setMessage] = useState(undefined);
    const settings = snapshot.value;
    const records = settings?.records ?? [];
    const provider = settings?.provider ?? 'spawn';
    const maxBatchSize = settings?.maxBatchSize ?? 3;
    const ids = useMemo(() => new Set(records.map(record => record.id)), [records]);
    if (snapshot.status === 'loading')
        return _jsx("section", { className: css.section, children: _jsx("p", { children: "\u6B63\u5728\u52A0\u8F7D\u6570\u5B57\u751F\u547D\u914D\u7F6E\u2026" }) });
    if (snapshot.status !== 'ready' || settings === undefined) {
        return _jsxs("section", { className: css.section, children: [_jsx("h2", { children: "\u6570\u5B57\u751F\u547D" }), _jsx("p", { className: css.notice, children: "\u5F53\u524D Host \u672A\u66B4\u9732 digital-life \u914D\u7F6E\u3002" })] });
    }
    const beginAdd = () => { setEditingId(undefined); setDraft({ ...EMPTY_RECORD }); setMessage(undefined); };
    const beginEdit = (record) => { setEditingId(record.id); setDraft({ ...record, toolFilter: record.toolFilter === undefined ? undefined : [...record.toolFilter] }); setMessage(undefined); };
    const save = () => {
        if (draft === undefined)
            return;
        const id = draft.id.trim();
        if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
            setMessage('ID 只能包含小写字母、数字和连字符。');
            return;
        }
        if (editingId !== id && ids.has(id)) {
            setMessage('该 ID 已存在。');
            return;
        }
        if (draft.name.trim() === '' || draft.tag.trim() === '' || draft.persona.trim() === '') {
            setMessage('名字、标签和人格设定不能为空。');
            return;
        }
        const next = { ...draft, id, name: draft.name.trim(), tag: draft.tag.trim(), persona: draft.persona.trim() };
        const nextRecords = editingId === undefined ? [...records, next] : records.map(record => record.id === editingId ? next : record);
        void props.scope.set('records', nextRecords).then(() => { setDraft(undefined); setEditingId(undefined); setMessage('已保存。'); });
    };
    const remove = (id) => {
        void props.scope.set('records', records.filter(record => record.id !== id)).then(() => { setMessage('已删除。'); });
    };
    return _jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { children: [_jsx("h2", { children: "\u6570\u5B57\u751F\u547D" }), _jsx("p", { children: "\u521B\u5EFA\u53EF\u7531\u4E3B\u4EE3\u7406\u901A\u8FC7\u5DE5\u5177\u54A8\u8BE2\u7684\u4EBA\u683C\u4EE3\u7406\uFF0C\u4E5F\u53EF\u5728\u8F93\u5165\u6846\u4E2D\u4F7F\u7528 @digital-id\u3002" })] }), _jsx("button", { className: css.primary, type: "button", onClick: beginAdd, disabled: !snapshot.writable, children: "\u65B0\u589E\u6570\u5B57\u751F\u547D" })] }), _jsxs("div", { className: css.runtime, children: [_jsxs("label", { children: ["\u5B50\u4EE3\u7406 Provider", _jsx("input", { value: provider, onChange: event => { void props.scope.set('provider', event.target.value); }, disabled: !snapshot.writable })] }), _jsxs("label", { children: ["\u5206\u7C7B\u6700\u5927\u54A8\u8BE2\u6570", _jsx("input", { type: "number", min: 1, max: 20, value: maxBatchSize, onChange: event => { void props.scope.set('maxBatchSize', Number(event.target.value)); }, disabled: !snapshot.writable })] })] }), message === undefined ? null : _jsx("p", { className: css.notice, children: message }), _jsx("div", { className: css.cards, children: records.length === 0 ? _jsx("div", { className: css.empty, children: "\u5C1A\u672A\u914D\u7F6E\u6570\u5B57\u751F\u547D\u3002" }) : records.map(record => _jsxs("article", { className: css.card, children: [_jsxs("div", { children: [_jsxs("div", { className: css.identity, children: [_jsx("strong", { children: record.name }), _jsx("span", { children: record.tag }), _jsxs("code", { children: ["@digital-", record.id] })] }), _jsx("p", { children: record.persona })] }), _jsxs("div", { className: css.actions, children: [_jsxs("label", { className: css.toggle, children: [_jsx("input", { type: "checkbox", checked: record.enabled, onChange: event => { void props.scope.set('records', records.map(item => item.id === record.id ? { ...item, enabled: event.target.checked } : item)); } }), "\u542F\u7528"] }), _jsx("button", { type: "button", onClick: () => { beginEdit(record); }, children: "\u7F16\u8F91" }), _jsx("button", { type: "button", className: css.danger, onClick: () => { remove(record.id); }, children: "\u5220\u9664" })] })] }, record.id)) }), draft === undefined ? null : _jsx(Editor, { draft: draft, setDraft: setDraft, onSave: save, onCancel: () => { setDraft(undefined); setEditingId(undefined); } })] });
}
function Editor({ draft, setDraft, onSave, onCancel }) {
    const update = (key, value) => { setDraft({ ...draft, [key]: value }); };
    return _jsx("div", { className: css.backdrop, children: _jsxs("div", { className: css.editor, role: "dialog", "aria-modal": "true", "aria-label": "\u7F16\u8F91\u6570\u5B57\u751F\u547D", children: [_jsx("h3", { children: draft.id === '' ? '新增数字生命' : `编辑 ${draft.name}` }), _jsxs("div", { className: css.form, children: [_jsxs("label", { children: ["ID", _jsx("input", { value: draft.id, onChange: event => { update('id', event.target.value); }, placeholder: "zhang-xx" })] }), _jsxs("label", { children: ["\u540D\u5B57", _jsx("input", { value: draft.name, onChange: event => { update('name', event.target.value); } })] }), _jsxs("label", { children: ["\u6807\u7B7E", _jsx("input", { value: draft.tag, onChange: event => { update('tag', event.target.value); }, placeholder: "\u4F01\u4E1A\u5BB6" })] }), _jsxs("label", { children: ["\u7C7B\u522B", _jsxs("select", { value: draft.category, onChange: event => { update('category', event.target.value); }, children: [_jsx("option", { value: "business", children: "\u4F01\u4E1A" }), _jsx("option", { value: "science", children: "\u79D1\u5B66" }), _jsx("option", { value: "culture", children: "\u6587\u5316" }), _jsx("option", { value: "custom", children: "\u81EA\u5B9A\u4E49" })] })] }), _jsxs("label", { className: css.full, children: ["\u4EBA\u683C\u8BBE\u5B9A", _jsx("textarea", { rows: 8, value: draft.persona, onChange: event => { update('persona', event.target.value); } })] }), _jsxs("label", { className: css.full, children: ["\u5141\u8BB8\u7684\u5DE5\u5177\uFF08\u9017\u53F7\u5206\u9694\uFF0C\u7559\u7A7A\u8868\u793A\u7EE7\u627F\uFF09", _jsx("input", { value: draft.toolFilter?.join(', ') ?? '', onChange: event => { const values = event.target.value.split(',').map(value => value.trim()).filter(Boolean); update('toolFilter', values.length === 0 ? undefined : values); } })] })] }), _jsxs("div", { className: css.editorActions, children: [_jsx("button", { type: "button", onClick: onCancel, children: "\u53D6\u6D88" }), _jsx("button", { className: css.primary, type: "button", onClick: onSave, children: "\u4FDD\u5B58" })] })] }) });
}
