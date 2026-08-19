import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { IconAgentPresetOutline16, IconChevronDownOutline14, Menu, } from "@deepseek-ai/dsh-client-ui-primitives";
import css from "./AgentPresetSelector.module.css";
/** Render the Harness-styled Agent preset and digital-life selectors. */
export function AgentPresetSelector({ load, select, records, selectLife, }) {
    const [options, setOptions] = useState([]);
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
    if (options.length === 0)
        return null;
    const presetName = chosen?.name ?? current;
    return (_jsxs("div", { className: css.root, children: [_jsx(Menu, { className: `${css.seatWrap} ${css.presetWrap}`, open: presetOpen, onClose: () => {
                    setPresetOpen(false);
                }, items: options.map((option) => ({
                    id: option.id,
                    label: (_jsxs("span", { className: css.item, children: [_jsx("span", { className: css.itemName, children: option.name }), _jsx("span", { className: css.itemDesc, children: option.description ?? "暂无说明" })] })),
                })), selectedId: current, onSelect: (id) => {
                    setPresetOpen(false);
                    setCurrent(id);
                    setBusy(true);
                    void select(id).finally(() => {
                        setBusy(false);
                    });
                }, align: "start", portal: true, anchor: _jsxs("button", { type: "button", className: css.seat, "aria-haspopup": "menu", "aria-expanded": presetOpen, title: presetName, disabled: busy, onClick: () => {
                        setPresetOpen((value) => !value);
                    }, children: [_jsx(IconAgentPresetOutline16, { className: css.icon }), _jsx("span", { className: css.seatLabel, children: presetName }), _jsx(IconChevronDownOutline14, { className: css.chevron })] }) }), current === "digital-life-mode" && (_jsx(Menu, { className: `${css.seatWrap} ${css.lifeWrap}`, open: lifeOpen, onClose: () => {
                    setLifeOpen(false);
                }, items: records().map((record) => ({
                    id: record.id,
                    label: (_jsxs("span", { className: css.item, children: [_jsx("span", { className: css.itemName, children: record.name }), _jsxs("span", { className: css.itemDesc, children: [record.description, " \u00B7 ", record.category === "custom" ? record.customCategory : record.category] })] })),
                })), selectedId: life, onSelect: (id) => {
                    setLifeOpen(false);
                    setLife(id);
                    void selectLife(id);
                }, align: "start", portal: true, anchor: _jsxs("button", { type: "button", className: `${css.seat} ${life === "" ? css.required : ""}`, "aria-haspopup": "menu", "aria-expanded": lifeOpen, title: life === "" ? "请选择一个数字生命" : chosenLife?.name, onClick: () => {
                        setLifeOpen((value) => !value);
                    }, children: [_jsx("span", { className: css.lifeIcon, children: "\uD83E\uDDE0" }), _jsx("span", { className: css.seatLabel, children: chosenLife?.name ?? "选择数字生命" }), _jsx(IconChevronDownOutline14, { className: css.chevron })] }) }))] }));
}
