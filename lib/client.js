window.__ModuleLoader__.load({
	id: "dsh-digital-life",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region src/constants.ts
		const DIGITAL_LIFE_NAMESPACE = "digital-life";
		//#endregion
		//#region \0dsh-css:/Users/elon/code-space/GitHub/dsh-digital-life/src/client/DigitalLifeSettingSection.module.css.mjs
		const css$2 = ".wBixZG_section{max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:18px;display:flex}.wBixZG_header{justify-content:space-between;align-items:flex-start;gap:20px;display:flex}.wBixZG_header h2,.wBixZG_editor h3{margin:0;font-size:18px;line-height:26px}.wBixZG_header p,.wBixZG_card p,.wBixZG_notice,.wBixZG_empty{overflow:hidden}.wBixZG_preview{-webkit-line-clamp:2;line-clamp:2;text-overflow:ellipsis;word-break:break-word;-webkit-box-orient:vertical;display:-webkit-box;margin-top:8px!important}.wBixZG_header p,.wBixZG_card p,.wBixZG_notice,.wBixZG_empty{color:var(--dsw-alias-label-tertiary);margin:6px 0 0;font-size:14px;line-height:22px}.wBixZG_runtime{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);border-radius:12px;grid-template-columns:minmax(0,1fr) minmax(180px,220px);gap:14px;padding:16px;display:grid}.wBixZG_runtime label,.wBixZG_form label{min-width:0;color:var(--dsw-alias-label-secondary);flex-direction:column;gap:6px;font-size:13px;line-height:18px;display:flex}input,select,textarea{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;padding:9px 10px}.wBixZG_invalid{box-shadow:0 0 0 1px var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)!important}input:focus,select:focus,textarea:focus{outline:2px solid var(--dsw-alias-brand-primary-new-colorprimary-new-color);outline-offset:1px}.wBixZG_cards{flex-direction:column;gap:10px;display:flex}.wBixZG_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;justify-content:space-between;align-items:flex-start;gap:18px;padding:16px;display:flex}.wBixZG_cardMain{flex:auto;min-width:0}.wBixZG_identity{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.wBixZG_identity span,.wBixZG_identity code,.wBixZG_tagRow span{border:1px solid var(--dsw-alias-border-l3);border-radius:6px;padding:2px 7px;font-size:12px;line-height:17px}.wBixZG_identity code{color:var(--dsw-alias-label-tertiary)}.wBixZG_recordId{margin-left:auto}.wBixZG_tagRow{white-space:nowrap;gap:6px;min-width:0;max-width:100%;margin-top:8px;display:flex;overflow:hidden}.wBixZG_tagRow span{border:1px solid var(--dsw-alias-border-l3);max-width:180px;color:var(--dsw-alias-label-secondary);text-overflow:ellipsis;white-space:nowrap;border-radius:6px;flex:none;font-size:12px;line-height:17px;overflow:hidden}.wBixZG_tagRow:empty{display:none}.wBixZG_actions{white-space:nowrap;flex:none;justify-content:flex-end;align-items:center;gap:8px;display:flex}.wBixZG_actions button,.wBixZG_editorActions button,.wBixZG_primary{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);min-width:64px;height:34px;color:var(--dsw-alias-label-primary);font:inherit;white-space:nowrap;cursor:pointer;border-radius:17px;flex:none;justify-content:center;align-items:center;padding:0 13px;font-size:13px;line-height:20px;display:inline-flex}.wBixZG_actions button:hover,.wBixZG_editorActions button:hover{background:var(--dsw-alias-interactive-bg-hover)}.wBixZG_primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);border-color:#0000}.wBixZG_primary:hover{background:var(--dsw-alias-button-primary-hover)}.wBixZG_danger{color:var(--dsw-alias-state-error-primary)!important}.wBixZG_toggle{height:34px;color:var(--dsw-alias-label-secondary);white-space:nowrap;flex:none;align-items:center;gap:5px;font-size:13px;display:inline-flex}.wBixZG_toggle input{width:auto;accent-color:var(--dsw-alias-button-primary-fill)}.wBixZG_empty{border:1px dashed var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);text-align:center;border-radius:12px;padding:24px}.wBixZG_backdrop{z-index:1000;box-sizing:border-box;background:var(--dsw-alias-bg-mask-1);place-items:center;padding:24px;display:grid;position:fixed;inset:0}.wBixZG_editor{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);width:min(680px,100%);max-height:min(720px,90vh);color:var(--dsw-alias-label-primary);border-radius:16px;padding:22px;overflow:auto;box-shadow:0 20px 60px #0000004d}.wBixZG_form{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:18px;display:grid}.wBixZG_full{grid-column:1/-1}.wBixZG_editorActions{justify-content:flex-end;gap:8px;margin-top:20px;display:flex}@media (width<=700px){.wBixZG_header,.wBixZG_card{flex-direction:column}.wBixZG_header .wBixZG_primary{align-self:flex-start}.wBixZG_runtime,.wBixZG_form{grid-template-columns:1fr}.wBixZG_full{grid-column:auto}.wBixZG_actions{flex-wrap:wrap;justify-content:flex-start;width:100%}}.wBixZG_fileBinding{align-items:center;gap:8px;display:flex}.wBixZG_fileBinding>input:first-child{flex:auto}.wBixZG_fileBinding button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);height:38px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;border-radius:8px;flex:none;padding:0 12px}.wBixZG_hiddenFile{display:none}.wBixZG_hint,.wBixZG_fileError{font-size:12px;line-height:18px}.wBixZG_hint{color:var(--dsw-alias-label-tertiary)}.wBixZG_fileError{color:var(--dsw-alias-state-error-primary)}";
		const tagId$2 = "dsh-digital-life/DigitalLifeSettingSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-digital-life";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var DigitalLifeSettingSection_module_css_default = {
			"hiddenFile": "wBixZG_hiddenFile",
			"runtime": "wBixZG_runtime",
			"actions": "wBixZG_actions",
			"form": "wBixZG_form",
			"preview": "wBixZG_preview",
			"editorActions": "wBixZG_editorActions",
			"danger": "wBixZG_danger",
			"identity": "wBixZG_identity",
			"toggle": "wBixZG_toggle",
			"invalid": "wBixZG_invalid",
			"empty": "wBixZG_empty",
			"primary": "wBixZG_primary",
			"fileBinding": "wBixZG_fileBinding",
			"section": "wBixZG_section",
			"recordId": "wBixZG_recordId",
			"header": "wBixZG_header",
			"tagRow": "wBixZG_tagRow",
			"hint": "wBixZG_hint",
			"card": "wBixZG_card",
			"editor": "wBixZG_editor",
			"full": "wBixZG_full",
			"fileError": "wBixZG_fileError",
			"notice": "wBixZG_notice",
			"cardMain": "wBixZG_cardMain",
			"backdrop": "wBixZG_backdrop",
			"cards": "wBixZG_cards"
		};
		//#endregion
		//#region src/client/DigitalLifeSettingSection.tsx
		/**
		* Resolve the identity source stored for an editor draft.
		* @param draft Record entered in the settings editor.
		* @returns A record bound to either its managed Markdown file or an external Agent file.
		*/
		function normalizeDigitalLifeRecord(draft) {
			const agent = draft.agent?.trim() ?? "";
			const id = draft.id.trim();
			const managedBinding = `${id}/agents/${id}.md`;
			const managed = agent === "" || agent === managedBinding;
			return {
				...draft,
				id,
				name: draft.name.trim(),
				description: draft.description.trim(),
				customCategory: draft.customCategory?.trim() || void 0,
				tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
				agent: managed ? managedBinding : agent,
				persona: managed ? draft.persona.trim() : ""
			};
		}
		const EMPTY_RECORD = {
			id: "",
			name: "",
			description: "",
			category: "business",
			customCategory: "",
			tags: [],
			persona: "",
			enabled: true
		};
		/** Render the persisted digital-life settings editor. */
		function DigitalLifeSettingSection(props) {
			const snapshot = props.useSettings((value) => value);
			const [draft, setDraft] = (0, react.useState)(void 0);
			const [editingId, setEditingId] = (0, react.useState)(void 0);
			const [message, setMessage] = (0, react.useState)(void 0);
			const [invalidFields, setInvalidFields] = (0, react.useState)(/* @__PURE__ */ new Set());
			const settings = snapshot.value;
			const records = (settings?.records ?? []).map((record) => ({
				...record,
				description: record.description?.trim() || record.name,
				tags: record.tags ?? (record.tag?.trim() ? [record.tag.trim()] : [])
			}));
			const provider = settings?.provider ?? "spawn";
			const maxBatchSize = settings?.maxBatchSize ?? 3;
			const ids = (0, react.useMemo)(() => new Set(records.map((record) => record.id)), [records]);
			if (snapshot.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				className: DigitalLifeSettingSection_module_css_default.section,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "正在加载数字生命配置…" })
			});
			if (snapshot.status !== "ready" || settings === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: DigitalLifeSettingSection_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "数字生命" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: DigitalLifeSettingSection_module_css_default.notice,
					children: "当前 Host 未暴露 digital-life 配置。"
				})]
			});
			const beginAdd = () => {
				setEditingId(void 0);
				setDraft({ ...EMPTY_RECORD });
				setInvalidFields(/* @__PURE__ */ new Set());
				setMessage(void 0);
			};
			const beginEdit = (record) => {
				setEditingId(record.id);
				setDraft(void 0);
				setMessage("正在读取人格文件…");
				props.loadIdentity(record.id).then((identity) => {
					setDraft({
						...record,
						persona: identity,
						toolFilter: record.toolFilter === void 0 ? void 0 : [...record.toolFilter]
					});
					setInvalidFields(/* @__PURE__ */ new Set());
					setMessage(void 0);
				}).catch((error) => {
					setEditingId(void 0);
					setMessage(error instanceof Error ? error.message : String(error));
				});
			};
			const save = () => {
				if (draft === void 0) return;
				const id = draft.id.trim();
				const missing = /* @__PURE__ */ new Set();
				if (id === "") missing.add("id");
				if (draft.name.trim() === "") missing.add("name");
				if (draft.description.trim() === "") missing.add("description");
				if (draft.category === "custom" && draft.description.trim().length < 2) missing.add("description");
				if (draft.tags.some((tag) => tag.trim() === "")) missing.add("tags");
				if (draft.category === "custom" && (draft.customCategory?.trim().length ?? 0) < 2) missing.add("customCategory");
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
				const nextRecords = editingId === void 0 ? [...records, next] : records.map((record) => record.id === editingId ? next : record);
				props.scope.set("records", nextRecords).then(() => {
					setDraft(void 0);
					setEditingId(void 0);
					setMessage("已保存，Agent 人格文件已同步");
				}).catch((error) => {
					setMessage(error instanceof Error ? error.message : String(error));
				});
			};
			const remove = (id) => {
				props.scope.set("records", records.filter((record) => record.id !== id)).then(() => {
					setMessage("已删除");
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: DigitalLifeSettingSection_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: DigitalLifeSettingSection_module_css_default.header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "数字生命" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "创建可由主代理通过工具咨询的人格代理，也可在输入框中使用 @id。" })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: DigitalLifeSettingSection_module_css_default.primary,
							type: "button",
							onClick: beginAdd,
							disabled: !snapshot.writable,
							children: "新增数字生命"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: DigitalLifeSettingSection_module_css_default.runtime,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: DigitalLifeSettingSection_module_css_default.wide,
								children: ["插件数据目录（stateDir）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									value: settings.stateDir ?? "",
									onChange: (event) => {
										props.scope.set("stateDir", event.target.value);
									},
									placeholder: "默认 ~/.dsh/digital-life/",
									disabled: !snapshot.writable
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["子代理 Provider", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								value: provider,
								onChange: (event) => {
									props.scope.set("provider", event.target.value);
								},
								disabled: !snapshot.writable
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["分类最大咨询数", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "number",
								min: 1,
								max: 20,
								value: maxBatchSize,
								onChange: (event) => {
									props.scope.set("maxBatchSize", Number(event.target.value));
								},
								disabled: !snapshot.writable
							})] })
						]
					}),
					message === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: DigitalLifeSettingSection_module_css_default.notice,
						children: message
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: DigitalLifeSettingSection_module_css_default.cards,
						children: records.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: DigitalLifeSettingSection_module_css_default.empty,
							children: "尚未配置数字生命"
						}) : records.map((record) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
							className: DigitalLifeSettingSection_module_css_default.card,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: DigitalLifeSettingSection_module_css_default.cardMain,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: DigitalLifeSettingSection_module_css_default.identity,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: record.name }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: record.category === "custom" ? record.customCategory : record.category }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", {
												className: DigitalLifeSettingSection_module_css_default.recordId,
												children: ["@", record.id]
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: DigitalLifeSettingSection_module_css_default.tagRow,
										title: record.tags.join(" · "),
										children: record.tags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: tag }, tag))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: DigitalLifeSettingSection_module_css_default.preview,
										children: record.description
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: DigitalLifeSettingSection_module_css_default.actions,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: DigitalLifeSettingSection_module_css_default.toggle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: record.enabled,
											onChange: (event) => {
												props.scope.set("records", records.map((item) => item.id === record.id ? {
													...item,
													enabled: event.target.checked
												} : item));
											}
										}), "启用"]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											beginEdit(record);
										},
										children: "编辑"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: DigitalLifeSettingSection_module_css_default.danger,
										onClick: () => {
											remove(record.id);
										},
										children: "删除"
									})
								]
							})]
						}, record.id))
					}),
					draft === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Editor, {
						draft,
						existing: editingId !== void 0,
						setDraft,
						invalidFields,
						clearInvalidField: (field) => {
							setInvalidFields((current) => {
								const next = new Set(current);
								next.delete(field);
								return next;
							});
						},
						onSave: save,
						onCancel: () => {
							setDraft(void 0);
							setEditingId(void 0);
						}
					})
				]
			});
		}
		function parseAgentMetadata(frontmatter) {
			const values = {};
			for (const line of frontmatter.split("\n")) {
				const match = /^(id|name|description):\s*["']?(.+?)["']?\s*$/.exec(line.trim());
				if (match === null) continue;
				const value = match[2].trim();
				if (match[1] === "id") values.id = value;
				if (match[1] === "name" && values.id === void 0) values.id = value;
				if (match[1] === "description" && values.name === void 0) values.name = value;
			}
			return values;
		}
		function Editor({ draft, existing, setDraft, invalidFields, clearInvalidField, onSave, onCancel }) {
			const update = (key, value) => {
				setDraft({
					...draft,
					[key]: value
				});
				if (invalidFields.has(String(key))) clearInvalidField(String(key));
			};
			const fileInput = (0, react.useRef)(null);
			const [boundFile, setBoundFile] = (0, react.useState)(void 0);
			const [fileError, setFileError] = (0, react.useState)(void 0);
			const bindFile = async (file) => {
				try {
					const markdown = (await file.text()).replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
					const end = markdown.startsWith("---\n") ? markdown.indexOf("\n---\n", 4) : -1;
					const frontmatter = end === -1 ? "" : markdown.slice(4, end);
					const identity = (end === -1 ? markdown : markdown.slice(end + 5)).trim();
					if (identity === "") throw new Error("Agent 文件没有身份正文。");
					const metadata = parseAgentMetadata(frontmatter);
					const fileId = metadata.id ?? file.name.replace(/\.md$/i, "");
					const id = /^[a-z0-9][a-z0-9-]*$/.test(fileId) ? fileId : draft.id;
					const name = metadata.name ?? draft.name;
					setDraft({
						...draft,
						id,
						name,
						agent: void 0,
						persona: identity
					});
					setBoundFile(file.name);
					setFileError(void 0);
				} catch (error) {
					setFileError(error instanceof Error ? error.message : String(error));
				}
			};
			const managedBinding = `${draft.id}/agents/${draft.id}.md`;
			const externalBinding = draft.agent !== void 0 && draft.agent !== managedBinding;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: DigitalLifeSettingSection_module_css_default.backdrop,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: DigitalLifeSettingSection_module_css_default.editor,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": "编辑数字生命",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: existing ? `编辑 ${draft.name || "数字生命"}` : "新增数字生命" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: DigitalLifeSettingSection_module_css_default.form,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["ID", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: invalidFields.has("id") ? DigitalLifeSettingSection_module_css_default.invalid : void 0,
									value: draft.id,
									onChange: (event) => {
										update("id", event.target.value);
									},
									placeholder: "user-xx",
									disabled: existing,
									readOnly: existing
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["名字", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: invalidFields.has("name") ? DigitalLifeSettingSection_module_css_default.invalid : void 0,
									value: draft.name,
									onChange: (event) => {
										update("name", event.target.value);
									}
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["能力标签（逗号分隔）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: invalidFields.has("tags") ? DigitalLifeSettingSection_module_css_default.invalid : void 0,
									value: draft.tags.join(", "),
									onChange: (event) => {
										update("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean));
									},
									placeholder: "例如：市场研究，结构化，审查"
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["主领域", /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: draft.category,
									onChange: (event) => {
										update("category", event.target.value);
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "business",
											children: "企业"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "science",
											children: "科学"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "tech",
											children: "技术"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "culture",
											children: "文化"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
											value: "custom",
											children: "自定义"
										})
									]
								})] }),
								draft.category === "custom" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["自定义主领域", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: invalidFields.has("customCategory") ? DigitalLifeSettingSection_module_css_default.invalid : void 0,
									value: draft.customCategory ?? "",
									onChange: (event) => update("customCategory", event.target.value),
									placeholder: "例如：战略咨询"
								})] }) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: DigitalLifeSettingSection_module_css_default.full,
									children: [
										"Agent 人格文件",
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: DigitalLifeSettingSection_module_css_default.fileBinding,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													value: draft.agent ?? (existing ? `agents/${draft.id}.md` : ""),
													onChange: (event) => {
														const value = event.target.value.trim();
														update("agent", value === "" ? void 0 : value);
														setBoundFile(void 0);
													},
													placeholder: "Host 路径，如 ~/.claude/agents/xxx.md",
													disabled: existing,
													readOnly: existing
												}),
												existing ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => fileInput.current?.click(),
													children: "选择并导入"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
													ref: fileInput,
													className: DigitalLifeSettingSection_module_css_default.hiddenFile,
													type: "file",
													accept: ".md,text/markdown,text/plain",
													onChange: (event) => {
														const file = event.target.files?.[0];
														if (file !== void 0) bindFile(file);
														event.target.value = "";
													}
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: fileError === void 0 ? DigitalLifeSettingSection_module_css_default.hint : DigitalLifeSettingSection_module_css_default.fileError,
											children: fileError ?? (externalBinding ? "外部 Agent 文件是唯一人格来源；插件不会复制或覆盖该文件。" : existing ? "修改人格设定后会同步写回托管 Agent 文件。" : boundFile === void 0 ? "填写 Host 文件路径可绑定外部文件；从浏览器选择文件会导入到托管文件。" : `已导入：${boundFile}，保存后写入 ${draft.id || "{id}"}/agents/${draft.id || "{id}"}.md`)
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: DigitalLifeSettingSection_module_css_default.full,
									children: ["描述", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: invalidFields.has("description") ? DigitalLifeSettingSection_module_css_default.invalid : void 0,
										value: draft.description,
										onChange: (event) => {
											update("description", event.target.value);
										},
										placeholder: "例如：擅长创业战略与现金流分析"
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: DigitalLifeSettingSection_module_css_default.full,
									children: [
										"人格设定 ",
										externalBinding ? "（由 Agent 文件提供，只读）" : existing ? "（修改后同步到 Agent 文件）" : "",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											className: invalidFields.has("persona") ? DigitalLifeSettingSection_module_css_default.invalid : void 0,
											rows: 8,
											value: draft.persona,
											readOnly: externalBinding,
											onChange: (event) => {
												update("persona", event.target.value);
											}
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: DigitalLifeSettingSection_module_css_default.full,
									children: ["允许的工具（逗号分隔，留空表示继承）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										value: draft.toolFilter?.join(", ") ?? "",
										onChange: (event) => {
											const values = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
											update("toolFilter", values.length === 0 ? void 0 : values);
										}
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: DigitalLifeSettingSection_module_css_default.editorActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: onCancel,
								children: "取消"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: DigitalLifeSettingSection_module_css_default.primary,
								type: "button",
								onClick: onSave,
								children: "保存"
							})]
						})
					]
				})
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/elon/code-space/GitHub/dsh-digital-life/src/client/ChatPanel.module.css.mjs
		const css$1 = ".GMxQQG_root{box-sizing:border-box;width:100%;padding:0 2px 8px;position:relative}.GMxQQG_trigger{box-sizing:border-box;width:100%;height:38px;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;background:0 0;border:1px solid #0000;border-radius:10px;align-items:center;gap:9px;padding:0 12px;display:flex}.GMxQQG_trigger:hover,.GMxQQG_trigger[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}.GMxQQG_triggerIcon{width:18px;height:18px;color:var(--dsw-alias-label-secondary);flex:0 0 18px;place-items:center;font-size:15px;display:grid}.GMxQQG_triggerText{flex-direction:column;flex:1;min-width:0;display:flex}.GMxQQG_triggerText strong{font-size:13px;font-weight:500;line-height:17px}.GMxQQG_triggerText small{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:15px;overflow:hidden}.GMxQQG_chevron{color:var(--dsw-alias-label-tertiary);font-size:12px}.GMxQQG_panel{z-index:1200;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);pointer-events:auto;border-radius:12px;width:100%;padding:8px;position:absolute;bottom:50px;left:0;box-shadow:0 16px 44px #0000003d}.GMxQQG_title{color:var(--dsw-alias-label-tertiary);padding:4px 8px 7px;font-size:11px}.GMxQQG_action{width:100%;min-height:36px;color:var(--dsw-alias-label-primary);text-align:left;font:inherit;cursor:pointer;background:0 0;border:0;border-radius:8px;align-items:center;gap:9px;padding:5px 8px;display:flex}.GMxQQG_action:hover{background:var(--dsw-alias-interactive-bg-hover)}.GMxQQG_icon,.GMxQQG_avatar{background:var(--dsw-alias-fill-tsp-secondary);border-radius:8px;flex:0 0 24px;place-items:center;width:24px;height:24px;font-size:12px;display:grid}.GMxQQG_text{flex-direction:column;min-width:0;display:flex}.GMxQQG_text strong{text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:500;line-height:17px;overflow:hidden}.GMxQQG_text small{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:15px}";
		const tagId$1 = "dsh-digital-life/ChatPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-digital-life";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var ChatPanel_module_css_default = {
			"chevron": "GMxQQG_chevron",
			"triggerText": "GMxQQG_triggerText",
			"avatar": "GMxQQG_avatar",
			"root": "GMxQQG_root",
			"icon": "GMxQQG_icon",
			"text": "GMxQQG_text",
			"panel": "GMxQQG_panel",
			"trigger": "GMxQQG_trigger",
			"title": "GMxQQG_title",
			"action": "GMxQQG_action",
			"triggerIcon": "GMxQQG_triggerIcon"
		};
		//#endregion
		//#region src/client/ChatPanel.tsx
		function ChatPanel({ wide, records, createSession }) {
			const [open, setOpen] = (0, react.useState)(false);
			const root = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				if (!open) return;
				const closeOutside = (event) => {
					if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
				};
				document.addEventListener("pointerdown", closeOutside);
				return () => {
					document.removeEventListener("pointerdown", closeOutside);
				};
			}, [open]);
			const start = (record) => {
				setOpen(false);
				createSession(record).catch((error) => {
					console.error("digital-life: failed to start standalone session", error);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: root,
				className: ChatPanel_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: ChatPanel_module_css_default.trigger,
					"aria-label": "Chat Panel",
					"aria-expanded": open,
					onClick: () => {
						if (wide) setOpen((value) => !value);
						else start();
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ChatPanel_module_css_default.triggerIcon,
							children: "💡"
						}),
						wide && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ChatPanel_module_css_default.triggerText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: "Chat" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "独立会话与数字生命" })]
						}),
						wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ChatPanel_module_css_default.chevron,
							children: open ? "⌃" : "⌄"
						})
					]
				}), wide && open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: ChatPanel_module_css_default.panel,
					"aria-label": "启动独立会话",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ChatPanel_module_css_default.title,
							children: "启动独立会话"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ChatPanel_module_css_default.action,
							onClick: () => {
								start();
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ChatPanel_module_css_default.icon,
								children: "＋"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "新建独立会话" })]
						}),
						records().map((record) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ChatPanel_module_css_default.action,
							onClick: () => {
								start(record);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ChatPanel_module_css_default.avatar,
								children: record.name.slice(0, 1)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: ChatPanel_module_css_default.text,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: record.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: record.category })]
							})]
						}, record.id))
					]
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:/Users/elon/code-space/GitHub/dsh-digital-life/src/client/AgentPresetSelector.module.css.mjs
		const css = ".HW1xEW_root{align-items:center;gap:2px;min-width:0;display:flex}.HW1xEW_seatWrap{min-width:54px}.HW1xEW_presetWrap{flex-shrink:12}.HW1xEW_lifeWrap{flex-shrink:1}.HW1xEW_seat{max-width:min(100%,240px);min-height:28px;color:var(--dsw-alias-label-primary);white-space:nowrap;cursor:pointer;background:0 0;border:none;border-radius:16px;align-items:center;gap:4px;padding:0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex;overflow:hidden}.HW1xEW_seat:not(:disabled):hover,.HW1xEW_seat[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}.HW1xEW_seat:disabled{cursor:default;color:var(--dsw-alias-label-quaternary)}.HW1xEW_seatLabel{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.HW1xEW_icon,.HW1xEW_lifeIcon{color:var(--dsw-alias-label-primary);flex:none}.HW1xEW_lifeIcon{place-items:center;width:16px;height:16px;font-size:13px;display:inline-grid}.HW1xEW_chevron{color:var(--dsw-alias-label-caption);flex:none}.HW1xEW_item{flex-direction:column;gap:2px;max-width:min(280px,100vw - 64px);display:flex}.HW1xEW_itemName{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}.HW1xEW_itemDesc{color:var(--dsw-alias-label-caption);white-space:normal;font-size:12px;line-height:16px}.HW1xEW_required{box-shadow:inset 0 0 0 1px var(--dsw-alias-state-warn-primary);color:var(--dsw-alias-state-warn-primary)}@media (width<=430px){.HW1xEW_root:has(.HW1xEW_lifeWrap) .HW1xEW_presetWrap .HW1xEW_seatLabel{display:none}}";
		const tagId = "dsh-digital-life/AgentPresetSelector.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-digital-life";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var AgentPresetSelector_module_css_default = {
			"root": "HW1xEW_root",
			"seat": "HW1xEW_seat",
			"seatLabel": "HW1xEW_seatLabel",
			"lifeWrap": "HW1xEW_lifeWrap",
			"itemDesc": "HW1xEW_itemDesc",
			"seatWrap": "HW1xEW_seatWrap",
			"required": "HW1xEW_required",
			"lifeIcon": "HW1xEW_lifeIcon",
			"item": "HW1xEW_item",
			"itemName": "HW1xEW_itemName",
			"presetWrap": "HW1xEW_presetWrap",
			"chevron": "HW1xEW_chevron",
			"icon": "HW1xEW_icon"
		};
		//#endregion
		//#region src/client/AgentPresetSelector.tsx
		/** Render the Harness-styled Agent preset and digital-life selectors. */
		function AgentPresetSelector({ load, select, records, selectLife }) {
			const [options, setOptions] = (0, react.useState)([]);
			const [current, setCurrent] = (0, react.useState)("");
			const [life, setLife] = (0, react.useState)("");
			const [presetOpen, setPresetOpen] = (0, react.useState)(false);
			const [lifeOpen, setLifeOpen] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				load().then((value) => {
					setOptions(value.options);
					setCurrent(value.current);
				});
			}, [load]);
			const chosen = options.find((option) => option.id === current);
			const chosenLife = records().find((record) => record.id === life);
			if (options.length === 0) return null;
			const presetName = chosen?.name ?? current;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: AgentPresetSelector_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					className: `${AgentPresetSelector_module_css_default.seatWrap} ${AgentPresetSelector_module_css_default.presetWrap}`,
					open: presetOpen,
					onClose: () => {
						setPresetOpen(false);
					},
					items: options.map((option) => ({
						id: option.id,
						label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: AgentPresetSelector_module_css_default.item,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSelector_module_css_default.itemName,
								children: option.name
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSelector_module_css_default.itemDesc,
								children: option.description ?? "暂无说明"
							})]
						})
					})),
					selectedId: current,
					onSelect: (id) => {
						setPresetOpen(false);
						setCurrent(id);
						setBusy(true);
						select(id).finally(() => {
							setBusy(false);
						});
					},
					align: "start",
					portal: true,
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: AgentPresetSelector_module_css_default.seat,
						"aria-haspopup": "menu",
						"aria-expanded": presetOpen,
						title: presetName,
						disabled: busy,
						onClick: () => {
							setPresetOpen((value) => !value);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, { className: AgentPresetSelector_module_css_default.icon }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSelector_module_css_default.seatLabel,
								children: presetName
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: AgentPresetSelector_module_css_default.chevron })
						]
					})
				}), current === "digital-life-mode" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					className: `${AgentPresetSelector_module_css_default.seatWrap} ${AgentPresetSelector_module_css_default.lifeWrap}`,
					open: lifeOpen,
					onClose: () => {
						setLifeOpen(false);
					},
					items: records().map((record) => ({
						id: record.id,
						label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: AgentPresetSelector_module_css_default.item,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSelector_module_css_default.itemName,
								children: record.name
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: AgentPresetSelector_module_css_default.itemDesc,
								children: [
									record.description,
									" · ",
									record.category === "custom" ? record.customCategory : record.category
								]
							})]
						})
					})),
					selectedId: life,
					onSelect: (id) => {
						setLifeOpen(false);
						setLife(id);
						selectLife(id);
					},
					align: "start",
					portal: true,
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${AgentPresetSelector_module_css_default.seat} ${life === "" ? AgentPresetSelector_module_css_default.required : ""}`,
						"aria-haspopup": "menu",
						"aria-expanded": lifeOpen,
						title: life === "" ? "请选择一个数字生命" : chosenLife?.name,
						onClick: () => {
							setLifeOpen((value) => !value);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSelector_module_css_default.lifeIcon,
								children: "🧠"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSelector_module_css_default.seatLabel,
								children: chosenLife?.name ?? "选择数字生命"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: AgentPresetSelector_module_css_default.chevron })
						]
					})
				})]
			});
		}
		//#endregion
		//#region src/client/installAgentPresetSelector.ts
		/** Install the composite Agent preset and digital-life selector into the Hero slot. */
		function installAgentPresetSelector(ctx, records) {
			const connection = ctx.get("connection");
			const sessions = ctx.get("sessions");
			if (connection === void 0 || sessions === void 0) return;
			let selectedPreset = "";
			let selectedLife = "";
			const rpc = connection.rpc;
			const injected = () => ({
				records,
				async selectLife(id) {
					selectedLife = id;
					const currentId = sessions.list.getSnapshot().current;
					if (currentId === void 0) return;
					const result = await rpc.call("/digital-life", "bind", {
						sessionId: currentId,
						recordId: id
					});
					if (!result.ok) throw new Error(result.error.message);
				},
				async load() {
					const response = await connection.api.agentPresets.list({});
					if (!response.result.ok) throw new Error(response.result.error.message);
					const presets = response.result.value.presets.filter((item) => item.broken === void 0);
					const currentId = sessions.list.getSnapshot().current;
					const current = currentId === void 0 ? void 0 : sessions.list.getSnapshot().byId[currentId]?.agentPreset;
					selectedPreset = selectedPreset || current || presets.find((item) => item.isDefault)?.id || presets[0]?.id || "";
					return {
						options: presets.map((item) => ({
							id: item.id,
							name: item.name ?? item.id,
							...item.description === void 0 ? {} : { description: item.description }
						})),
						current: selectedPreset
					};
				},
				async select(id) {
					selectedPreset = id;
					const currentId = sessions.list.getSnapshot().current;
					if (currentId === void 0) return;
					const summary = sessions.list.getSnapshot().byId[currentId];
					if (summary === void 0 || !summary.blank || summary.agentPreset === id) return;
					const response = await connection.api.agentPresets.select({
						sessionId: currentId,
						agentPreset: id
					});
					if (!response.result.ok) throw new Error(response.result.error.message);
					sessions.noteAgentPreset(currentId, response.result.value.agentPreset);
				}
			});
			ctx.effect(() => {
				let appliedKey = "";
				let running = false;
				const applySelection = async () => {
					if (running || selectedPreset !== "digital-life-mode" || selectedLife === "") return;
					const state = sessions.list.getSnapshot();
					const currentId = state.current;
					const summary = currentId === void 0 ? void 0 : state.byId[currentId];
					if (summary === void 0 || !summary.blank) return;
					const key = `${summary.id}:${selectedPreset}:${selectedLife}`;
					if (key === appliedKey) return;
					running = true;
					try {
						if (summary.agentPreset !== selectedPreset) {
							const preset = await connection.api.agentPresets.select({
								sessionId: summary.id,
								agentPreset: selectedPreset
							});
							if (!preset.result.ok) throw new Error(preset.result.error.message);
							sessions.noteAgentPreset(summary.id, preset.result.value.agentPreset);
						}
						const persona = await rpc.call("/digital-life", "bind", {
							sessionId: summary.id,
							recordId: selectedLife
						});
						if (!persona.ok) throw new Error(persona.error.message);
						appliedKey = key;
					} catch (error) {
						console.error("digital-life: failed to apply hero selection", error);
					} finally {
						running = false;
					}
				};
				const stop = sessions.list.subscribe(() => {
					applySelection();
				});
				applySelection();
				return stop;
			}, "digital-life: apply hero persona to blank session");
			ctx.slots.inject("conversation.hero.agentPreset", () => ctx.slots.register({
				name: "conversation.hero.agentPreset",
				priority: -10,
				inject: injected
			}, AgentPresetSelector));
		}
		//#endregion
		//#region src/client/index.ts
		const inject = [
			"slots",
			"inputTriggers",
			"connection",
			"remote",
			"settingsScope"
		];
		function apply(ctx) {
			const scope = ctx.settingsScope.bind({ namespace: DIGITAL_LIFE_NAMESPACE });
			const hookSource = {
				getSnapshot: () => scope.getSnapshot(),
				subscribe: (listener) => scope.subscribe(listener)
			};
			const injected = () => ({
				hooks: { settings: hookSource },
				scope,
				async loadIdentity(id) {
					const connection = ctx.get("connection");
					if (connection === void 0) throw new Error("digital-life: connection service is unavailable");
					const result = await connection.rpc.call("/digital-life", "identity", { recordId: id });
					if (!result.ok) throw new Error(result.error.message);
					return result.value.identity;
				}
			});
			const records = () => scope.getSnapshot().value?.records?.filter((record) => record.enabled) ?? [];
			const createSession = async (record) => {
				const connection = ctx.get("connection");
				if (connection === void 0) throw new Error("digital-life: connection service is unavailable");
				const sessions = ctx.get("sessions");
				if (sessions === void 0) throw new Error("digital-life: sessions service is unavailable");
				const rpc = connection.rpc;
				const generated = `digital-life-${record?.id ?? "independent"}-${Date.now()}`;
				const result = await connection.api.sessions.create({
					sessionId: generated,
					...record === void 0 ? {} : { agentPreset: "digital-life-mode" }
				});
				if (!result.result.ok) throw new Error(result.result.error.message);
				const sessionId = result.result.value.sessionId;
				await new Promise((resolve, reject) => {
					let disposed = false;
					let dispose = () => {};
					const finish = (error) => {
						if (disposed) return;
						disposed = true;
						window.clearTimeout(timer);
						dispose();
						if (error === void 0) resolve();
						else reject(error);
					};
					const settle = () => {
						if (sessions.binding(sessionId) !== void 0) finish();
					};
					dispose = sessions.list.subscribe(settle);
					const timer = window.setTimeout(() => {
						finish(/* @__PURE__ */ new Error(`digital-life: created session "${sessionId}" was not published to the client`));
					}, 1e4);
					settle();
				});
				sessions.open(sessionId);
				const session = sessions.binding(sessionId)?.session;
				if (session === void 0) throw new Error(`digital-life: unknown created session "${sessionId}"`);
				if (record !== void 0) {
					const init = await rpc.call("/digital-life", "bind", {
						sessionId,
						recordId: record.id
					});
					if (!init.ok) throw new Error(init.error.message);
				}
				const accepted = await session.prompt([{
					type: "text",
					text: record === void 0 ? "你好，我们开始一个独立对话。请简短确认对话已开始，并询问我想讨论什么。" : `你好。请保持数字生命“${record.name}”的身份开始独立对话。职责描述：${record.description}。请先简短介绍你能提供的帮助。`
				}], "queue");
				if (!accepted.ok) throw new Error(accepted.error.message);
				return sessionId;
			};
			const chatInjected = () => ({
				records,
				createSession
			});
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "digital-life-chat-panel",
				order: -10,
				inject: chatInjected
			}, ChatPanel));
			installAgentPresetSelector(ctx, records);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: DIGITAL_LIFE_NAMESPACE,
				order: 25,
				label: "数字生命",
				inject: injected
			}, DigitalLifeSettingSection));
			const source = {
				trigger: "@",
				name: DIGITAL_LIFE_NAMESPACE,
				order: 5,
				candidates(_session, { query }) {
					const needle = query;
					return Promise.resolve(records().filter((item) => `${item.id} ${item.name} ${item.description} ${item.tags.join(" ")}`.toLowerCase().includes(needle.toLowerCase())).map((item) => ({
						name: item.id,
						description: `${item.name} · ${item.description}`
					})));
				},
				warm() {
					Promise.resolve();
				},
				lexicon() {
					return records().map((item) => item.id);
				},
				subscribeLexicon(_session, listener) {
					return scope.subscribe(listener);
				},
				onPick({ candidate }) {
					return { text: `@${candidate.name} ` };
				},
				codec: {
					clipboardText: (ref) => `@${ref}`,
					serialize: (ref) => Promise.resolve(`@${ref}`)
				}
			};
			const inputTriggers = ctx.get("inputTriggers");
			ctx.effect(() => inputTriggers.registerSource(source), "digital-life: @ source");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map