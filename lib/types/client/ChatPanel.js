import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import css from "./ChatPanel.module.css";
export function ChatPanel({ wide, records, createSession }) {
    const [open, setOpen] = useState(false);
    const root = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const closeOutside = (event) => {
            if (event.target instanceof Node && !root.current?.contains(event.target))
                setOpen(false);
        };
        document.addEventListener("pointerdown", closeOutside);
        return () => {
            document.removeEventListener("pointerdown", closeOutside);
        };
    }, [open]);
    const start = (record) => {
        setOpen(false);
        void createSession(record).catch((error) => {
            console.error("digital-life: failed to start standalone session", error);
        });
    };
    return (_jsxs("div", { ref: root, className: css.root, children: [_jsxs("button", { type: "button", className: css.trigger, "aria-label": "Chat Panel", "aria-expanded": open, onClick: () => {
                    if (wide)
                        setOpen((value) => !value);
                    else
                        start();
                }, children: [_jsx("span", { className: css.triggerIcon, children: "\uD83D\uDCA1" }), wide && (_jsxs("span", { className: css.triggerText, children: [_jsx("strong", { children: "Chat" }), _jsx("small", { children: "\u72EC\u7ACB\u4F1A\u8BDD\u4E0E\u6570\u5B57\u751F\u547D" })] })), wide && _jsx("span", { className: css.chevron, children: open ? "⌃" : "⌄" })] }), wide && open && (_jsxs("section", { className: css.panel, "aria-label": "\u542F\u52A8\u72EC\u7ACB\u4F1A\u8BDD", children: [_jsx("div", { className: css.title, children: "\u542F\u52A8\u72EC\u7ACB\u4F1A\u8BDD" }), _jsxs("button", { type: "button", className: css.action, onClick: () => {
                            start();
                        }, children: [_jsx("span", { className: css.icon, children: "\uFF0B" }), _jsx("span", { children: "\u65B0\u5EFA\u72EC\u7ACB\u4F1A\u8BDD" })] }), records().map((record) => (_jsxs("button", { type: "button", className: css.action, onClick: () => {
                            start(record);
                        }, children: [_jsx("span", { className: css.avatar, children: record.name.slice(0, 1) }), _jsxs("span", { className: css.text, children: [_jsx("strong", { children: record.name }), _jsx("small", { children: record.category })] })] }, record.id)))] }))] }));
}
