window.__ModuleLoader__.load({
	id: "dsh-digital-life",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/constants.ts
		const DIGITAL_LIFE_NAMESPACE = "digital-life";
		const DIGITAL_LIFE_CATEGORIES = [
			"business",
			"science",
			"culture",
			"tech",
			"entertainment",
			"custom"
		];
		/** Pattern shared by record and team ids. */
		const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
		/**
		* List the members that block launching a review with this team.
		* @param team Saved lineup.
		* @param records Current digital-life records.
		* @returns Missing or disabled members, analysts first, then reviewer and coordinator.
		*/
		function teamIssues(team, records) {
			const byId = new Map(records.map((record) => [record.id, record]));
			return [.../* @__PURE__ */ new Set([
				...team.analystIds,
				team.reviewerId,
				...team.coordinatorId === void 0 ? [] : [team.coordinatorId]
			])].flatMap((id) => {
				const record = byId.get(id);
				if (record === void 0) return [{
					id,
					kind: "missing"
				}];
				return record.enabled ? [] : [{
					id,
					kind: "disabled"
				}];
			});
		}
		/**
		* Trim a team draft and drop duplicate analysts and an analyst reused as reviewer.
		* @param draft Team entered in the editor.
		* @returns The team as it is stored.
		*/
		function normalizeTeam(draft) {
			const reviewerId = draft.reviewerId.trim();
			const analystIds = [...new Set(draft.analystIds.map((id) => id.trim()))].filter((id) => id !== "" && id !== reviewerId);
			const coordinatorId = draft.coordinatorId?.trim() ?? "";
			const members = /* @__PURE__ */ new Set([
				...analystIds,
				reviewerId,
				...coordinatorId === "" ? [] : [coordinatorId]
			]);
			const responsibilities = Object.fromEntries(Object.entries(draft.responsibilities ?? {}).map(([id, duty]) => [id.trim(), duty.trim()]).filter(([id, duty]) => members.has(id) && duty !== ""));
			return {
				id: draft.id.trim(),
				name: draft.name.trim(),
				purpose: draft.purpose.trim(),
				analystIds,
				reviewerId,
				...coordinatorId === "" ? {} : { coordinatorId },
				...Object.keys(responsibilities).length === 0 ? {} : { responsibilities },
				...draft.persona?.trim() ? { persona: draft.persona.trim() } : {}
			};
		}
		/** Longest team persona the Host accepts. */
		const TEAM_PERSONA_LIMIT = 8e3;
		/**
		* Check a normalized team before it is written.
		* @param team Normalized team.
		* @param teams Saved teams.
		* @param editingId Id of the team being edited, if any.
		* @param recordIds Expert ids; a new team id may not shadow one in `@` mentions.
		* @returns The first failing field and its reason, or undefined when valid.
		*/
		function teamError(team, teams, editingId, recordIds) {
			if (team.id === "") return {
				field: "id",
				reason: "required"
			};
			if (!ID_PATTERN.test(team.id)) return {
				field: "id",
				reason: "invalidId"
			};
			if (team.id !== editingId && teams.some((item) => item.id === team.id)) return {
				field: "id",
				reason: "duplicateId"
			};
			if (team.id !== editingId && recordIds.includes(team.id)) return {
				field: "id",
				reason: "idConflict"
			};
			if (team.name === "") return {
				field: "name",
				reason: "required"
			};
			if (team.analystIds.length < 1 || team.analystIds.length > 3) return {
				field: "analystIds",
				reason: "analystCount"
			};
			if (team.reviewerId === "") return {
				field: "reviewerId",
				reason: "required"
			};
			if (Object.values(team.responsibilities ?? {}).some((duty) => duty.length > 200)) return {
				field: "responsibilities",
				reason: "responsibilityLength"
			};
			if ((team.persona?.length ?? 0) > 8e3) return {
				field: "persona",
				reason: "teamPersonaLength"
			};
		}
		/**
		* Build the request a launch submits.
		* @param lineup Analysts and reviewer.
		* @param question Brief entered by the user.
		* @param teamId Saved team, so the Host uses its coordinator and responsibilities.
		* @returns The request handed to the main agent.
		*/
		function requestFromTeam(lineup, question, teamId) {
			return {
				question: question.trim(),
				expertIds: [...lineup.analystIds],
				reviewerId: lineup.reviewerId,
				...teamId === void 0 ? {} : { teamId }
			};
		}
		/**
		* Teams that reference a record, used to warn before deleting it.
		* @param recordId Record about to be removed.
		* @param teams Saved teams.
		* @returns Teams naming the record as analyst, reviewer, or coordinator.
		*/
		function teamsUsing(recordId, teams) {
			return teams.filter((team) => team.reviewerId === recordId || team.analystIds.includes(recordId) || team.coordinatorId === recordId);
		}
		/**
		* Derive a free team id from its name, falling back to `team`.
		* @param name Team name.
		* @param teams Saved teams.
		* @returns An id matching the record id pattern and unused by `teams`.
		*/
		function suggestTeamId(name, teams) {
			const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "team";
			const taken = new Set(teams.map((team) => team.id));
			if (!taken.has(base)) return base;
			let index = 2;
			while (taken.has(`${base}-${index}`)) index += 1;
			return `${base}-${index}`;
		}
		/**
		* Rank `@` candidates: experts first, then saved teams whose id no expert already uses.
		* @param records Enabled digital-life records.
		* @param teams Saved teams.
		* @param query Text typed after `@`.
		* @returns Matching candidates.
		*/
		function mentionCandidates(records, teams, query) {
			const needle = query.toLowerCase();
			const matches = (text) => text.toLowerCase().includes(needle);
			const experts = records.filter((item) => matches(`${item.id} ${item.name} ${item.description} ${item.tags.join(" ")}`)).map((item) => ({
				name: item.id,
				description: `${item.name} · ${item.description}`,
				kind: "expert"
			}));
			const taken = new Set(records.map((item) => item.id));
			const saved = teams.filter((team) => !taken.has(team.id) && matches(`${team.id} ${team.name} ${team.purpose}`)).map((team) => ({
				name: team.id,
				description: team.purpose === "" ? team.name : `${team.name} · ${team.purpose}`,
				kind: "team"
			}));
			return [...experts, ...saved];
		}
		//#endregion
		//#region src/client/agent-file.ts
		function parseAgentMetadata(frontmatter) {
			const values = {};
			for (const line of frontmatter.split("\n")) {
				const match = /^(id|name|description):\s*["']?(.+?)["']?\s*$/.exec(line.trim());
				if (match === null) continue;
				const value = match[2]?.trim() ?? "";
				if (match[1] === "id") values.id = value;
				if (match[1] === "name" && values.id === void 0) values.id = value;
				if (match[1] === "description" && values.name === void 0) values.name = value;
			}
			return values;
		}
		/**
		* Import a browser-selected Agent Markdown file into an editor draft.
		* @param markdown File contents.
		* @param fileName Name the browser reports for the file.
		* @param draft Draft the file is imported into.
		* @returns The draft carrying the file's identity inline, or undefined when the file has no identity body.
		*/
		function applyAgentMarkdown(markdown, fileName, draft) {
			const text = markdown.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
			const end = text.startsWith("---\n") ? text.indexOf("\n---\n", 4) : -1;
			const frontmatter = end === -1 ? "" : text.slice(4, end);
			const identity = (end === -1 ? text : text.slice(end + 5)).trim();
			if (identity === "") return void 0;
			const metadata = parseAgentMetadata(frontmatter);
			const fileId = metadata.id ?? fileName.replace(/\.md$/i, "");
			const id = ID_PATTERN.test(fileId) ? fileId : draft.id;
			const name = metadata.name ?? draft.name;
			const { agent: _agent, ...withoutAgent } = draft;
			return {
				...withoutAgent,
				id,
				name,
				persona: identity
			};
		}
		//#endregion
		//#region \0dsh-digital-life-css:/Users/elon/code-space/GitHub/dsh-digital-life/src/client/settings.module.css.mjs
		const css$2 = ".Euc6Vq_section{max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:16px;display:flex}.Euc6Vq_header h2{margin:0;font-size:18px;line-height:26px}.Euc6Vq_muted,.Euc6Vq_header p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.Euc6Vq_header p{margin-top:4px}.Euc6Vq_tabLabel{align-items:center;gap:6px;display:inline-flex}.Euc6Vq_panel{flex-direction:column;gap:14px;min-width:0;display:flex}.Euc6Vq_panel:focus-visible{outline:none}.Euc6Vq_toolbar{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.Euc6Vq_grow{flex:220px;min-width:0}.Euc6Vq_filters{flex-wrap:wrap;gap:6px;display:flex}.Euc6Vq_list{flex-direction:column;gap:8px;display:flex}.Euc6Vq_card{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2);justify-content:space-between;align-items:flex-start;gap:16px;min-width:0;padding:14px 16px;display:flex}.Euc6Vq_cardMain{flex-direction:column;flex:1;gap:6px;min-width:0;display:flex}.Euc6Vq_identity{flex-wrap:wrap;align-items:center;gap:6px;min-width:0;display:flex}.Euc6Vq_identity strong{font-size:14px;font-weight:500;line-height:22px}.Euc6Vq_code{color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-mono,ui-monospace, monospace);font-size:12px}.Euc6Vq_tagRow{flex-wrap:wrap;gap:4px;display:flex}.Euc6Vq_preview{color:var(--dsw-alias-label-tertiary);-webkit-line-clamp:2;line-clamp:2;word-break:break-word;-webkit-box-orient:vertical;margin:0;font-size:13px;line-height:20px;display:-webkit-box;overflow:hidden}.Euc6Vq_actions{flex:none;align-items:center;gap:4px;display:flex}.Euc6Vq_empty{border:.5px dashed var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-tertiary);text-align:center;padding:28px 16px;font-size:13px}.Euc6Vq_error{color:var(--dsw-alias-label-error);margin:0;font-size:13px;line-height:20px}.Euc6Vq_block{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-2);flex-direction:column;gap:12px;padding:16px;display:flex}.Euc6Vq_blockHead{justify-content:space-between;align-items:center;gap:8px;display:flex}.Euc6Vq_blockHead h3{margin:0;font-size:14px;font-weight:500;line-height:22px}.Euc6Vq_form{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px;display:grid}.Euc6Vq_field{flex-direction:column;gap:6px;min-width:0;display:flex}.Euc6Vq_full{grid-column:1/-1}.Euc6Vq_label{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:18px}.Euc6Vq_control{box-sizing:border-box;width:100%}.Euc6Vq_textarea{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);width:100%;min-height:96px;color:var(--dsw-alias-label-primary);font:inherit;resize:vertical;outline:none;padding:6px 8px;font-size:14px;line-height:22px}.Euc6Vq_textarea:focus{border-color:var(--dsw-alias-state-business-primary)}.Euc6Vq_textarea::placeholder{color:var(--dsw-alias-label-dimmed)}.Euc6Vq_textarea:read-only{color:var(--dsw-alias-label-secondary)}.Euc6Vq_control.Euc6Vq_invalid,.Euc6Vq_textarea.Euc6Vq_invalid,.Euc6Vq_select.Euc6Vq_invalid{border-color:var(--dsw-alias-state-error-primary)}.Euc6Vq_select{box-sizing:border-box;justify-content:space-between;width:100%;height:32px;font-weight:400}.Euc6Vq_selectWrap{width:100%;display:block}.Euc6Vq_hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.Euc6Vq_hint.Euc6Vq_fieldError{color:var(--dsw-alias-label-error)}.Euc6Vq_fileRow{align-items:center;gap:8px;display:flex}.Euc6Vq_hiddenFile{display:none}.Euc6Vq_checks{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 16px;display:grid}.Euc6Vq_dialog{width:min(640px,100%);max-height:100%;overflow:hidden}.Euc6Vq_dialogNarrow{width:min(520px,100%);max-height:100%;overflow:hidden}.Euc6Vq_dialogContent{overscroll-behavior:contain;min-height:0;overflow-y:auto}.Euc6Vq_catalog{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);flex-direction:column;max-height:240px;display:flex;overflow-y:auto}.Euc6Vq_catalogItem{color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;font:inherit;background:0 0;border:0;flex-direction:column;gap:2px;padding:8px 12px;display:flex}.Euc6Vq_catalogItem+.Euc6Vq_catalogItem{border-top:.5px solid var(--dsw-alias-border-l2)}.Euc6Vq_catalogItem:hover{background:var(--dsw-alias-interactive-bg-hover)}.Euc6Vq_catalogItem[aria-selected=true]{background:var(--dsw-alias-bg-layer-3)}.Euc6Vq_catalogItem small{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.Euc6Vq_reviewRow{align-items:center;gap:10px;min-width:0;padding:8px 0;display:flex}.Euc6Vq_reviewRow+.Euc6Vq_reviewRow{border-top:.5px solid var(--dsw-alias-border-l2)}.Euc6Vq_reviewMain{flex-direction:column;flex:1;min-width:0;display:flex}.Euc6Vq_reviewMain span{text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:20px;overflow:hidden}.Euc6Vq_reviewMain small{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.Euc6Vq_teamRun{flex-direction:column;gap:12px;display:flex}.Euc6Vq_teamRunHead{color:var(--dsw-alias-label-secondary);justify-content:space-between;align-items:center;gap:10px;font-size:13px;line-height:20px;display:flex}.Euc6Vq_disagreementGroup ul{margin:4px 0 0;padding-left:18px;font-size:13px;line-height:20px}.Euc6Vq_stageGraph{grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:0;padding:0;list-style:none;display:grid}.Euc6Vq_stageColumn{flex-direction:column;gap:6px;min-width:0;display:flex}.Euc6Vq_stageNode{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;font:inherit;background:0 0;flex-direction:column;gap:2px;padding:8px;font-size:13px;display:flex}.Euc6Vq_stageNode:hover{background:var(--dsw-alias-interactive-bg-hover)}.Euc6Vq_stageNode[aria-expanded=true]{background:var(--dsw-alias-bg-layer-3)}.Euc6Vq_stageNode small{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;font-size:12px;line-height:18px;overflow:hidden}.Euc6Vq_stageNode .Euc6Vq_error{color:var(--dsw-alias-label-error)}@media (width<=560px){.Euc6Vq_form,.Euc6Vq_checks{grid-template-columns:minmax(0,1fr)}.Euc6Vq_card{flex-direction:column}.Euc6Vq_stageGraph{grid-template-columns:minmax(0,1fr)}}";
		const tagId$2 = "dsh-digital-life/settings.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-digital-life";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var settings_module_css_default = {
			"actions": "Euc6Vq_actions",
			"block": "Euc6Vq_block",
			"blockHead": "Euc6Vq_blockHead",
			"card": "Euc6Vq_card",
			"cardMain": "Euc6Vq_cardMain",
			"catalog": "Euc6Vq_catalog",
			"catalogItem": "Euc6Vq_catalogItem",
			"checks": "Euc6Vq_checks",
			"code": "Euc6Vq_code",
			"control": "Euc6Vq_control",
			"dialog": "Euc6Vq_dialog",
			"dialogContent": "Euc6Vq_dialogContent",
			"dialogNarrow": "Euc6Vq_dialogNarrow",
			"disagreementGroup": "Euc6Vq_disagreementGroup",
			"empty": "Euc6Vq_empty",
			"error": "Euc6Vq_error",
			"field": "Euc6Vq_field",
			"fieldError": "Euc6Vq_fieldError",
			"fileRow": "Euc6Vq_fileRow",
			"filters": "Euc6Vq_filters",
			"form": "Euc6Vq_form",
			"full": "Euc6Vq_full",
			"grow": "Euc6Vq_grow",
			"header": "Euc6Vq_header",
			"hiddenFile": "Euc6Vq_hiddenFile",
			"hint": "Euc6Vq_hint",
			"identity": "Euc6Vq_identity",
			"invalid": "Euc6Vq_invalid",
			"label": "Euc6Vq_label",
			"list": "Euc6Vq_list",
			"muted": "Euc6Vq_muted",
			"panel": "Euc6Vq_panel",
			"preview": "Euc6Vq_preview",
			"reviewMain": "Euc6Vq_reviewMain",
			"reviewRow": "Euc6Vq_reviewRow",
			"section": "Euc6Vq_section",
			"select": "Euc6Vq_select",
			"selectWrap": "Euc6Vq_selectWrap",
			"stageColumn": "Euc6Vq_stageColumn",
			"stageGraph": "Euc6Vq_stageGraph",
			"stageNode": "Euc6Vq_stageNode",
			"tabLabel": "Euc6Vq_tabLabel",
			"tagRow": "Euc6Vq_tagRow",
			"teamRun": "Euc6Vq_teamRun",
			"teamRunHead": "Euc6Vq_teamRunHead",
			"textarea": "Euc6Vq_textarea",
			"toolbar": "Euc6Vq_toolbar"
		};
		//#endregion
		//#region src/client/controls.tsx
		/**
		* A single-choice picker built from the primitive Menu, standing in for a
		* native select so dialogs keep the shared control look.
		* @returns The trigger button with its anchored menu.
		*/
		function MenuSelect({ id, value, options, placeholder, invalid = false, disabled = false, onChange }) {
			const [open, setOpen] = (0, react.useState)(false);
			const chosen = options.find((option) => option.value === value);
			const items = options.map((option) => ({
				id: option.value,
				label: option.label,
				...option.disabled === true ? { disabled: true } : {}
			}));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				className: settings_module_css_default.selectWrap,
				open,
				items,
				selectedId: chosen?.value,
				onSelect: (next) => {
					setOpen(false);
					onChange(next);
				},
				onClose: () => {
					setOpen(false);
				},
				align: "start",
				portal: true,
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					...id === void 0 ? {} : { id },
					variant: "outline",
					className: `${settings_module_css_default.select} ${invalid ? settings_module_css_default.invalid : ""}`,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					"aria-invalid": invalid || void 0,
					disabled,
					onClick: () => {
						setOpen((current) => !current);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: chosen?.label ?? placeholder }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineMedium, { size: 14 })]
				})
			});
		}
		/** Report an error thrown by an async action as display text. */
		function errorText(error) {
			return error instanceof Error ? error.message : String(error);
		}
		//#endregion
		//#region src/client/locales.ts
		/** UI copy for the digital-life settings and session controls. */
		const zh = {
			nav: "数字生命",
			expertAiPanel: "专家 AI",
			title: "数字生命",
			intro: "创建可由主代理通过工具咨询的人格代理，也可在输入框中使用 @id。",
			add: "新增数字生命",
			expertLibrary: "专家方法库",
			expertLibraryHint: "从 mimeographs 按需导入公开方法包，内容尚未经本项目专业评测。",
			expertRevision: "来源版本（分支或标签）",
			expertRevisionCached: "无法连接 GitHub，使用本地缓存的目录。",
			loadExpertCatalog: "加载专家目录",
			searchExperts: "搜索专家",
			chooseExpert: "选择专家",
			importExpert: "导入并启用",
			expertImported: "已导入专家：@{id}；如已存在，保留其原有配置与启用状态。",
			expertIdConflict: "记录 {id} 已被占用，导入未覆盖该记录。请在配置中使用其他 ID。",
			expertDirectoryChanged: "导入过程中数据目录发生变化，请在当前目录重新导入。",
			expertPublicMethod: "公开方法",
			expertUnreviewed: "未评测",
			planReview: "科研与技术方案评审",
			planReviewHint: "提交方案后，在新会话中请求 Agent 调用评审工具，依次进行独立分析、批评和汇总。结果保留原始意见及方法来源。",
			reviewAnalyst: "分析专家（1–3 名）",
			reviewReviewer: "审查与汇总专家",
			reviewBrief: "方案、目标、资料与约束",
			startPlanReview: "在新会话中发起评审",
			reviewSubmitted: "评审请求已提交，请在会话中查看工具执行；报告生成后可在此刷新查看。",
			reviewRequestInstruction: "请调用 start_team_run 按团队编排评审，使用下列参数，再按推荐顺序调用 run_team_stage；简报产生补问时先问我，回答后调用 amend_team_brief。不要模拟专家或跳过团队工具。",
			reviewHistory: "评审记录",
			refreshReviews: "刷新记录",
			noReviews: "尚无评审记录",
			cancelReview: "停止评审",
			exportReviewMarkdown: "导出 Markdown",
			exportReviewJson: "导出 JSON 与依据",
			reviewRunning: "进行中",
			reviewCompleted: "已完成",
			reviewPartial: "部分完成",
			reviewFailed: "失败",
			reviewCancelled: "已取消",
			reviewTimedOut: "已超时",
			reviewOpen: "等待推进",
			reviewExpired: "已过期",
			stateDir: "插件数据目录（stateDir）",
			stateDirPlaceholder: "默认 ~/.dsh/digital-life/",
			provider: "子代理 Provider",
			maxBatchSize: "分类最大咨询数",
			empty: "尚未配置数字生命",
			enabled: "启用",
			edit: "编辑",
			remove: "删除",
			loading: "正在加载数字生命配置…",
			unavailable: "当前 Host 未暴露 digital-life 配置。",
			readingIdentity: "正在读取人格文件…",
			required: "请填写标红的必填字段。",
			invalidId: "ID 只能包含小写字母、数字和连字符。",
			duplicateId: "该 ID 已存在。",
			saved: "已保存，Agent 人格文件已同步",
			deleted: "已删除",
			writeFailed: "保存失败，请重试。",
			dialogEdit: "编辑数字生命",
			dialogAdd: "新增数字生命",
			defaultLife: "数字生命",
			id: "ID",
			name: "名字",
			namePlaceholder: "例如：李红",
			tags: "能力标签（逗号分隔）",
			tagsPlaceholder: "例如：市场研究，结构化，审查",
			category: "主领域",
			categoryBusiness: "企业",
			categoryScience: "科学",
			categoryTech: "技术",
			categoryCulture: "文化",
			categoryEntertainment: "娱乐",
			categoryCustom: "自定义",
			customCategory: "自定义主领域",
			customCategoryPlaceholder: "例如：战略咨询",
			agent: "Agent 人格文件",
			agentPlaceholder: "Host 路径，如 ~/.claude/agents/xxx.md",
			importFile: "选择并导入",
			externalHint: "外部 Agent 文件是唯一人格来源；插件不会复制或覆盖该文件。",
			managedExistingHint: "修改人格设定后会同步写回托管 Agent 文件。",
			managedNewHint: "填写 Host 文件路径可绑定外部文件；从浏览器选择文件会导入到托管文件。",
			importedHint: "已导入：{file}，保存后写入 {path}",
			description: "描述",
			descriptionPlaceholder: "例如：擅长创业战略与现金流分析",
			persona: "人格设定",
			personaExternal: "（由 Agent 文件提供，只读）",
			personaManaged: "（修改后同步到 Agent 文件）",
			tools: "允许的工具（逗号分隔，留空表示继承）",
			cancel: "取消",
			save: "保存",
			identityError: "Agent 文件没有身份正文。",
			chat: "Chat",
			chatDescription: "独立会话与数字生命",
			startSession: "启动独立会话",
			newSession: "新建独立会话",
			chatAria: "Chat Panel",
			startSessionAria: "启动独立会话",
			presetNoDescription: "暂无说明",
			chooseLife: "选择数字生命",
			chooseLifeRequired: "请选择一个数字生命",
			independentGreeting: "你好，我们开始一个独立对话。请简短确认对话已开始，并询问我想讨论什么。",
			sessionGreeting: "你好。请保持数字生命“{name}”的身份开始独立对话。职责描述：{description}。请先简短介绍你能提供的帮助。",
			tabsLabel: "数字生命设置",
			tabExperts: "专家",
			tabTeams: "专家团",
			tabGeneral: "通用设置",
			close: "关闭",
			searchRecords: "搜索名称、ID 或标签",
			filterAll: "全部",
			noMatches: "没有匹配的数字生命",
			importMenu: "导入",
			importFromFile: "从 Agent 文件导入",
			importFromLibrary: "从专家方法库导入",
			deleteRecordTitle: "删除“{name}”",
			deleteRecordDescription: "将从配置中移除 @{id}。",
			deleteRecordInUse: "将从配置中移除 @{id}。以下专家团引用了它，删除后需要重新指定成员：{teams}。",
			deleteAcknowledge: "我已了解此操作无法撤销",
			confirmDelete: "删除",
			addTeam: "新建专家团",
			teamsHint: "专家团保存一组固定的分析专家与审查汇总专家，可直接用于方案评审。",
			emptyTeams: "尚未创建专家团",
			teamAnalysts: "分析：{names}",
			teamReviewer: "审查：{name}",
			teamCoordinatorName: "协调：{name}",
			teamIdShadowed: "@{id} 与专家同名，@ 候选中将优先选择专家",
			teamIdConflict: "团队 ID 不能与专家 ID 相同。",
			teamCoordinator: "协调者",
			coordinatorByReviewer: "由审查者兼任",
			teamResponsibilities: "成员职责",
			responsibilityFor: "@{id} 的职责",
			responsibilityPlaceholder: "@{id}：例如统计方法；留空为综合分析",
			responsibilityHint: "每条最多 200 字；留空的成员按综合分析处理。",
			responsibilityLength: "职责不能超过 200 字。",
			issueMissing: "@{id} 不存在",
			issueDisabled: "@{id} 已停用",
			useTeam: "用此团评审",
			dialogAddTeam: "新建专家团",
			dialogEditTeam: "编辑专家团",
			teamName: "团队名称",
			teamNamePlaceholder: "例如：技术方案评审",
			teamId: "团队 ID",
			teamPurpose: "用途说明",
			teamPurposePlaceholder: "例如：评审架构与实施风险",
			teamPersona: "主持人人格",
			teamPersonaPlaceholder: "例如：你是技术评审会的主持人，先厘清目标和约束，再组织成员独立分析……",
			teamPersonaHint: "从设置面板发起评审时，会话以这一人格主持专家团，而不是某位成员；留空使用中立的默认主持人。最多 8000 字。",
			teamPersonaLength: "主持人人格不能超过 8000 字。",
			analystLimit: "最多 3 名；审查专家不能同时担任分析专家。",
			analystCount: "请选择 1–3 名分析专家。",
			reviewerRequired: "请选择审查与汇总专家。",
			teamSaved: "专家团已保存",
			teamDeleted: "专家团已删除",
			deleteTeamTitle: "删除专家团“{name}”",
			deleteTeamDescription: "只删除团队配置，成员数字生命与评审记录保持不变。",
			launchMode: "评审阵容",
			launchTeam: "专家团",
			launchAdhoc: "临时组队",
			chooseTeam: "选择专家团",
			noTeamsToLaunch: "尚无专家团，可先新建或切换到临时组队。",
			saveAsTeam: "另存为专家团",
			lineupBlocked: "部分成员不可用，请先启用或编辑团队。",
			openReport: "查看报告",
			enterSession: "进入会话",
			reportTitle: "评审报告",
			stageBrief: "简报",
			stageAnalysis: "分析",
			stageCrossCritique: "交叉批评",
			stageReview: "审查",
			stageSynthesis: "汇总",
			stageSkipped: "未执行",
			stageAttempts: "第 {count} 次",
			stageNoReport: "该阶段没有报告。",
			teamRunGraph: "阶段任务图",
			teamRunBudget: "调用 {calls} · 用时 {time}",
			noSynthesis: "尚未生成汇总。",
			missingStagesNote: "缺失阶段：{stages}",
			disagreementFact: "事实冲突",
			disagreementAssumption: "假设不同",
			disagreementApplicability: "适用性不同",
			disagreementValue: "价值取舍",
			disagreementTest: "实验：{test}",
			resolutionGatherEvidence: "补查资料",
			resolutionExperiment: "设计实验",
			resolutionHumanDecision: "交给人判断",
			copyCode: "复制",
			copiedCode: "已复制",
			footnotes: "脚注",
			generalHint: "以下设置保存后作用于所有数字生命咨询与评审。",
			readOnly: "当前配置为只读。",
			saveFailed: "Host 未接受修改，请检查后重试。",
			saving: "保存中…",
			overridden: "已自定义",
			reset: "恢复默认",
			invalidValue: "请输入有效的正整数。",
			stateDirHint: "存放托管人格文件、专家包与评审记录。",
			providerHint: "运行数字生命所用的子代理 Provider，默认 spawn。",
			maxBatchSizeHint: "按领域一次最多咨询的数字生命数量，默认 3。"
		};
		const en = {
			nav: "Digital lives",
			expertAiPanel: "Expert AI",
			title: "Digital lives",
			intro: "Create persona agents that the primary agent can consult through tools, or mention with @id in the composer.",
			add: "Add digital life",
			expertLibrary: "Expert method library",
			expertLibraryHint: "Import public method packages from mimeographs on demand; professional capabilities have not been evaluated by this project.",
			expertRevision: "Source version (branch or tag)",
			expertRevisionCached: "GitHub is unreachable; using the locally cached catalog.",
			loadExpertCatalog: "Load expert catalog",
			searchExperts: "Search experts",
			chooseExpert: "Choose an expert",
			importExpert: "Import and enable",
			expertImported: "Expert imported: @{id}; any existing configuration and enabled state are preserved.",
			expertIdConflict: "Record {id} is already in use and was not overwritten. Use a different ID in configuration.",
			expertDirectoryChanged: "The data directory changed during import. Import again into the current directory.",
			expertPublicMethod: "Public method",
			expertUnreviewed: "Not evaluated",
			planReview: "Research and technical plan review",
			planReviewHint: "Send your brief to a new session and ask the Agent to run independent analysis, critique, and synthesis. Reports retain original opinions and method sources.",
			reviewAnalyst: "Analysis experts (1–3)",
			reviewReviewer: "Critique and synthesis expert",
			reviewBrief: "Plan, goals, materials, and constraints",
			startPlanReview: "Request review in a new session",
			reviewSubmitted: "Request submitted. Follow tool execution in the session; refresh this view after a report is created.",
			reviewRequestInstruction: "Call start_team_run with the following arguments to orchestrate the team review, then call run_team_stage in the recommended order. If the brief raises clarifying questions, ask me first and call amend_team_brief with my answer. Do not simulate the experts or skip the team tools.",
			reviewHistory: "Review history",
			refreshReviews: "Refresh history",
			noReviews: "No reviews yet",
			cancelReview: "Stop review",
			exportReviewMarkdown: "Export Markdown",
			exportReviewJson: "Export JSON and evidence",
			reviewRunning: "Running",
			reviewCompleted: "Completed",
			reviewPartial: "Partially completed",
			reviewFailed: "Failed",
			reviewCancelled: "Cancelled",
			reviewTimedOut: "Timed out",
			reviewOpen: "Waiting for next stage",
			reviewExpired: "Expired",
			stateDir: "Plugin data directory (stateDir)",
			stateDirPlaceholder: "Default: ~/.dsh/digital-life/",
			provider: "Subagent provider",
			maxBatchSize: "Maximum category consultations",
			empty: "No digital lives configured",
			enabled: "Enabled",
			edit: "Edit",
			remove: "Delete",
			loading: "Loading digital-life configuration…",
			unavailable: "The Host has not exposed the digital-life configuration.",
			readingIdentity: "Reading identity file…",
			required: "Complete the required fields marked in red.",
			invalidId: "ID may contain only lowercase letters, digits, and hyphens.",
			duplicateId: "That ID already exists.",
			saved: "Saved; the Agent identity file is synchronized",
			deleted: "Deleted",
			writeFailed: "The change could not be saved. Please try again.",
			dialogEdit: "Edit digital life",
			dialogAdd: "Add digital life",
			defaultLife: "digital life",
			id: "ID",
			name: "Name",
			namePlaceholder: "For example: Alex Chen",
			tags: "Capability tags (comma-separated)",
			tagsPlaceholder: "For example: research, structured analysis, review",
			category: "Primary domain",
			categoryBusiness: "Business",
			categoryScience: "Science",
			categoryTech: "Technology",
			categoryCulture: "Culture",
			categoryEntertainment: "Entertainment",
			categoryCustom: "Custom",
			customCategory: "Custom domain",
			customCategoryPlaceholder: "For example: strategic consulting",
			agent: "Agent identity file",
			agentPlaceholder: "Host path, for example ~/.claude/agents/xxx.md",
			importFile: "Choose and import",
			externalHint: "The external Agent file is the sole identity source; the plugin will not copy or overwrite it.",
			managedExistingHint: "Edits to the persona will be written to the managed Agent file.",
			managedNewHint: "Enter a Host path to bind an external file; browser-selected files are imported into the managed file.",
			importedHint: "Imported: {file}; saved to {path}",
			description: "Description",
			descriptionPlaceholder: "For example: focuses on startup strategy and cash-flow analysis",
			persona: "Persona",
			personaExternal: "(provided by the Agent file; read-only)",
			personaManaged: "(edits sync to the Agent file)",
			tools: "Allowed tools (comma-separated; blank inherits)",
			cancel: "Cancel",
			save: "Save",
			identityError: "The Agent file has no identity body.",
			chat: "Chat",
			chatDescription: "Standalone sessions and digital lives",
			startSession: "Start standalone session",
			newSession: "New standalone session",
			chatAria: "Chat Panel",
			startSessionAria: "Start standalone session",
			presetNoDescription: "No description",
			chooseLife: "Choose a digital life",
			chooseLifeRequired: "Choose a digital life",
			independentGreeting: "Hello. Start this standalone conversation, briefly confirm that it has begun, and ask what I would like to discuss.",
			sessionGreeting: "Hello. Start this standalone conversation in the identity of “{name}”. Role description: {description}. Briefly introduce how you can help.",
			tabsLabel: "Digital-life settings",
			tabExperts: "Experts",
			tabTeams: "Expert teams",
			tabGeneral: "General",
			close: "Close",
			searchRecords: "Search by name, ID, or tag",
			filterAll: "All",
			noMatches: "No digital lives match",
			importMenu: "Import",
			importFromFile: "From an Agent file",
			importFromLibrary: "From the expert method library",
			deleteRecordTitle: "Delete “{name}”",
			deleteRecordDescription: "@{id} will be removed from configuration.",
			deleteRecordInUse: "@{id} will be removed from configuration. These expert teams reference it and will need a new member: {teams}.",
			deleteAcknowledge: "I understand this cannot be undone",
			confirmDelete: "Delete",
			addTeam: "New expert team",
			teamsHint: "An expert team saves a fixed set of analysts and a reviewer for plan reviews.",
			emptyTeams: "No expert teams yet",
			teamAnalysts: "Analysts: {names}",
			teamReviewer: "Reviewer: {name}",
			teamCoordinatorName: "Coordinator: {name}",
			teamIdShadowed: "@{id} matches an expert ID; @ suggestions prefer the expert",
			teamIdConflict: "The team ID cannot match an expert ID.",
			teamCoordinator: "Coordinator",
			coordinatorByReviewer: "Reviewer doubles as coordinator",
			teamResponsibilities: "Member responsibilities",
			responsibilityFor: "Responsibility of @{id}",
			responsibilityPlaceholder: "@{id}: for example statistical methods; blank means general analysis",
			responsibilityHint: "Up to 200 characters each; blank members do general analysis.",
			responsibilityLength: "A responsibility cannot exceed 200 characters.",
			issueMissing: "@{id} is missing",
			issueDisabled: "@{id} is disabled",
			useTeam: "Review with this team",
			dialogAddTeam: "New expert team",
			dialogEditTeam: "Edit expert team",
			teamName: "Team name",
			teamNamePlaceholder: "For example: Technical plan review",
			teamId: "Team ID",
			teamPurpose: "Purpose",
			teamPurposePlaceholder: "For example: review architecture and delivery risk",
			teamPersona: "Host persona",
			teamPersonaPlaceholder: "For example: You chair a technical review. Clarify goals and constraints first, then have members analyze independently…",
			teamPersonaHint: "A review started from Settings runs in a session hosted with this persona, not as one of the members. Leave blank for a neutral default host. Up to 8000 characters.",
			teamPersonaLength: "The host persona cannot exceed 8000 characters.",
			analystLimit: "Up to 3; the reviewer cannot also be an analyst.",
			analystCount: "Choose 1–3 analysts.",
			reviewerRequired: "Choose a reviewer.",
			teamSaved: "Expert team saved",
			teamDeleted: "Expert team deleted",
			deleteTeamTitle: "Delete team “{name}”",
			deleteTeamDescription: "Only the team is removed; its members and review history are kept.",
			launchMode: "Review lineup",
			launchTeam: "Expert team",
			launchAdhoc: "Ad hoc",
			chooseTeam: "Choose a team",
			noTeamsToLaunch: "No expert teams yet. Create one or switch to ad hoc.",
			saveAsTeam: "Save as team",
			lineupBlocked: "Some members are unavailable. Enable them or edit the team first.",
			openReport: "View report",
			enterSession: "Open session",
			reportTitle: "Review report",
			stageBrief: "Brief",
			stageAnalysis: "Analysis",
			stageCrossCritique: "Cross-critique",
			stageReview: "Review",
			stageSynthesis: "Synthesis",
			stageSkipped: "Not run",
			stageAttempts: "attempt {count}",
			stageNoReport: "This stage has no report.",
			teamRunGraph: "Stage graph",
			teamRunBudget: "Calls {calls} · time {time}",
			noSynthesis: "No synthesis yet.",
			missingStagesNote: "Missing stages: {stages}",
			disagreementFact: "Fact conflict",
			disagreementAssumption: "Different assumptions",
			disagreementApplicability: "Different applicability",
			disagreementValue: "Value trade-off",
			disagreementTest: "Experiment: {test}",
			resolutionGatherEvidence: "Gather evidence",
			resolutionExperiment: "Run an experiment",
			resolutionHumanDecision: "Human decision",
			copyCode: "Copy",
			copiedCode: "Copied",
			footnotes: "Footnotes",
			generalHint: "These settings apply to every digital-life consultation and review once saved.",
			readOnly: "This configuration is read-only.",
			saveFailed: "The Host did not accept the change. Check the values and try again.",
			saving: "Saving…",
			overridden: "Customized",
			reset: "Reset",
			invalidValue: "Enter a positive whole number.",
			stateDirHint: "Stores managed identity files, expert packages, and review history.",
			providerHint: "Subagent provider that runs digital lives; defaults to spawn.",
			maxBatchSizeHint: "Most digital lives consulted per category request; defaults to 3."
		};
		const NS = "digital-life";
		/** Localize built-in domains while preserving user-defined domain text. */
		function categoryLabel(record, t) {
			if (record.category === "custom") return record.customCategory ?? t("categoryCustom");
			switch (record.category) {
				case "business": return t("categoryBusiness");
				case "science": return t("categoryScience");
				case "tech": return t("categoryTech");
				case "culture": return t("categoryCulture");
				case "entertainment": return t("categoryEntertainment");
			}
		}
		//#endregion
		//#region src/client/records.ts
		/** Draft a new record starts from. */
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
				...draft.customCategory?.trim() ? { customCategory: draft.customCategory.trim() } : {},
				tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
				agent: managed ? managedBinding : agent,
				persona: managed ? draft.persona.trim() : ""
			};
		}
		/**
		* Check an editor draft before it is written.
		* @param draft Record entered in the editor.
		* @param ids Ids of the saved records.
		* @param editingId Id of the record being edited, if any.
		* @returns The problem blocking the save, or undefined when valid.
		*/
		function recordProblem(draft, ids, editingId) {
			const id = draft.id.trim();
			const missing = /* @__PURE__ */ new Set();
			if (id === "") missing.add("id");
			if (draft.name.trim() === "") missing.add("name");
			if (draft.description.trim() === "") missing.add("description");
			if (draft.category === "custom" && draft.description.trim().length < 2) missing.add("description");
			if (draft.tags.some((tag) => tag.trim() === "")) missing.add("tags");
			if (draft.category === "custom" && (draft.customCategory?.trim().length ?? 0) < 2) missing.add("customCategory");
			if (draft.persona.trim() === "" && (draft.agent?.trim() ?? "") === "") missing.add("persona");
			if (missing.size > 0) return {
				reason: "required",
				fields: missing
			};
			if (!ID_PATTERN.test(id)) return {
				reason: "invalidId",
				fields: /* @__PURE__ */ new Set(["id"])
			};
			if (editingId !== id && ids.has(id)) return {
				reason: "duplicateId",
				fields: /* @__PURE__ */ new Set(["id"])
			};
		}
		//#endregion
		//#region src/client/ExpertEditor.tsx
		/**
		* Add or edit one digital-life record in a dialog.
		* @returns The editor dialog.
		*/
		function ExpertEditor({ initial, existing, importedFile, ids, t, onSave, onCancel }) {
			const [draft, setDraft] = (0, react.useState)(initial);
			const [invalid, setInvalid] = (0, react.useState)(/* @__PURE__ */ new Set());
			const [error, setError] = (0, react.useState)(void 0);
			const [saving, setSaving] = (0, react.useState)(false);
			const [boundFile, setBoundFile] = (0, react.useState)(importedFile);
			const [fileError, setFileError] = (0, react.useState)(void 0);
			const fileInput = (0, react.useRef)(null);
			const update = (key, value) => {
				setDraft((current) => ({
					...current,
					[key]: value
				}));
				if (invalid.has(String(key))) setInvalid((current) => {
					const next = new Set(current);
					next.delete(String(key));
					return next;
				});
			};
			const bindFile = async (file) => {
				try {
					const next = applyAgentMarkdown(await file.text(), file.name, draft);
					if (next === void 0) throw new Error(t("identityError"));
					setDraft(next);
					setBoundFile(file.name);
					setFileError(void 0);
				} catch (reason) {
					setFileError(errorText(reason));
				}
			};
			const save = () => {
				const problem = recordProblem(draft, ids, existing ? initial.id : void 0);
				if (problem !== void 0) {
					setInvalid(problem.fields);
					setError(t(problem.reason));
					return;
				}
				setSaving(true);
				setError(void 0);
				onSave(draft).then((message) => {
					if (message !== void 0) setError(message);
				}).finally(() => {
					setSaving(false);
				});
			};
			const managedBinding = `${draft.id}/agents/${draft.id}.md`;
			const externalBinding = draft.agent !== void 0 && draft.agent !== managedBinding;
			const controlClass = (field) => `${settings_module_css_default.control} ${invalid.has(field) ? settings_module_css_default.invalid : ""}`;
			const fileHint = fileError ?? (externalBinding ? t("externalHint") : existing ? t("managedExistingHint") : boundFile === void 0 ? t("managedNewHint") : t("importedHint", {
				file: boundFile,
				path: `${draft.id || "{id}"}/agents/${draft.id || "{id}"}.md`
			}));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: onCancel,
				title: existing ? `${t("edit")} ${draft.name || t("defaultLife")}` : t("dialogAdd"),
				closeLabel: t("close"),
				className: settings_module_css_default.dialog ?? "",
				contentClassName: settings_module_css_default.dialogContent ?? "",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${settings_module_css_default.error} ${settings_module_css_default.grow}`,
						role: "alert",
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: onCancel,
						children: t("cancel")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						onClick: save,
						disabled: saving,
						children: saving ? t("saving") : t("save")
					})
				] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_module_css_default.form,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: settings_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("id")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: controlClass("id"),
								value: draft.id,
								onChange: (event) => {
									update("id", event.target.value);
								},
								placeholder: "user-xx",
								disabled: existing,
								readOnly: existing,
								...existing ? {} : { "data-modal-autofocus": "" }
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: settings_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("name")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: controlClass("name"),
								value: draft.name,
								onChange: (event) => {
									update("name", event.target.value);
								},
								placeholder: t("namePlaceholder")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: settings_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("tags")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: controlClass("tags"),
								value: draft.tags.join(", "),
								onChange: (event) => {
									update("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean));
								},
								placeholder: t("tagsPlaceholder")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("category")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuSelect, {
								value: draft.category,
								placeholder: t("category"),
								options: DIGITAL_LIFE_CATEGORIES.map((category) => ({
									value: category,
									label: categoryLabel({ category }, t)
								})),
								onChange: (value) => {
									update("category", value);
								}
							})]
						}),
						draft.category === "custom" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("customCategory")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: controlClass("customCategory"),
								value: draft.customCategory ?? "",
								onChange: (event) => {
									update("customCategory", event.target.value);
								},
								placeholder: t("customCategoryPlaceholder")
							})]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									className: settings_module_css_default.label,
									htmlFor: "digital-life-agent",
									children: t("agent")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: settings_module_css_default.fileRow,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
											id: "digital-life-agent",
											className: `${settings_module_css_default.control} ${settings_module_css_default.grow}`,
											value: draft.agent ?? (existing ? `agents/${draft.id}.md` : ""),
											onChange: (event) => {
												const value = event.target.value.trim();
												update("agent", value === "" ? void 0 : value);
												setBoundFile(void 0);
											},
											placeholder: t("agentPlaceholder"),
											disabled: existing,
											readOnly: existing
										}),
										existing ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutlineRegular, { size: 16 }),
											onClick: () => fileInput.current?.click(),
											children: t("importFile")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											ref: fileInput,
											className: settings_module_css_default.hiddenFile,
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
									className: `${settings_module_css_default.hint} ${fileError === void 0 ? "" : settings_module_css_default.fieldError}`,
									children: fileHint
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("description")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: controlClass("description"),
								value: draft.description,
								onChange: (event) => {
									update("description", event.target.value);
								},
								placeholder: t("descriptionPlaceholder")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: settings_module_css_default.label,
								children: [
									t("persona"),
									" ",
									externalBinding ? t("personaExternal") : existing ? t("personaManaged") : ""
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: `${settings_module_css_default.textarea} ${invalid.has("persona") ? settings_module_css_default.invalid : ""}`,
								rows: 8,
								value: draft.persona,
								readOnly: externalBinding,
								onChange: (event) => {
									update("persona", event.target.value);
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("tools")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: settings_module_css_default.control ?? "",
								value: draft.toolFilter?.join(", ") ?? "",
								onChange: (event) => {
									const values = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
									update("toolFilter", values.length === 0 ? void 0 : values);
								}
							})]
						})
					]
				})
			});
		}
		//#endregion
		//#region src/client/ExpertLibraryDialog.tsx
		/** Default source branch. */
		const DEFAULT_REF = "main";
		/**
		* Browse the mimeographs catalog on a branch or tag and import one expert package.
		* @returns The library dialog.
		*/
		function ExpertLibraryDialog({ api, writable, t, onImported, onClose }) {
			const [ref, setRef] = (0, react.useState)(DEFAULT_REF);
			const [loadedRef, setLoadedRef] = (0, react.useState)("");
			const [offline, setOffline] = (0, react.useState)(false);
			const [catalog, setCatalog] = (0, react.useState)([]);
			const [query, setQuery] = (0, react.useState)("");
			const [selected, setSelected] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const needle = query.trim().toLowerCase();
			const choices = catalog.filter((entry) => `${entry.name} ${entry.slug} ${entry.description}`.toLowerCase().includes(needle));
			const chosen = catalog.find((entry) => entry.slug === selected);
			const perform = async (action) => {
				setBusy(true);
				setError(void 0);
				try {
					await action();
				} catch (reason) {
					setError(errorText(reason));
				} finally {
					setBusy(false);
				}
			};
			const load = () => {
				perform(async () => {
					const loaded = await api.catalog(ref.trim());
					setLoadedRef(loaded.ref);
					setOffline(loaded.cached);
					setCatalog(loaded.experts);
					setSelected(loaded.experts[0]?.slug ?? "");
				});
			};
			const importChosen = () => {
				perform(async () => {
					onImported(await api.importExpert(selected, loadedRef));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose,
				title: t("expertLibrary"),
				description: t("expertLibraryHint"),
				closeLabel: t("close"),
				className: settings_module_css_default.dialogNarrow ?? "",
				contentClassName: settings_module_css_default.dialogContent ?? "",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${settings_module_css_default.error} ${settings_module_css_default.grow}`,
						role: "alert",
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: onClose,
						children: t("cancel")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						disabled: busy || !writable || chosen === void 0 || loadedRef === "",
						onClick: importChosen,
						children: t("importExpert")
					})
				] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_module_css_default.panel,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.field,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: settings_module_css_default.label,
								htmlFor: "digital-life-revision",
								children: t("expertRevision")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.fileRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "digital-life-revision",
									className: `${settings_module_css_default.control} ${settings_module_css_default.grow}`,
									value: ref,
									placeholder: DEFAULT_REF,
									spellCheck: false,
									disabled: busy,
									onChange: (event) => {
										setRef(event.target.value);
										setLoadedRef("");
										setCatalog([]);
										setSelected("");
									},
									onKeyDown: (event) => {
										if (event.key === "Enter" && !busy && ref.trim() !== "") load();
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "outline",
									disabled: busy || ref.trim() === "",
									onClick: load,
									"data-modal-autofocus": "",
									children: t("loadExpertCatalog")
								})]
							}),
							loadedRef === "" || !offline ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.hint,
								children: t("expertRevisionCached")
							})
						]
					}), catalog.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							className: settings_module_css_default.control ?? "",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 16 }),
							value: query,
							placeholder: t("searchExperts"),
							"aria-label": t("searchExperts"),
							onChange: (event) => {
								setQuery(event.target.value);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_module_css_default.catalog,
							role: "listbox",
							"aria-label": t("chooseExpert"),
							children: choices.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${settings_module_css_default.muted} ${settings_module_css_default.catalogItem}`,
								children: t("noMatches")
							}) : choices.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "option",
								"aria-selected": entry.slug === selected,
								className: settings_module_css_default.catalogItem,
								onClick: () => {
									setSelected(entry.slug);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: entry.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: entry.slug })]
							}, entry.slug))
						}),
						chosen === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.tagRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
									tone: "info",
									children: t("expertPublicMethod")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
									tone: "warning",
									children: t("expertUnreviewed")
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: settings_module_css_default.muted,
								children: chosen.description
							})]
						})
					] })]
				})
			});
		}
		//#endregion
		//#region src/client/ExpertsTab.tsx
		/**
		* List, search, add, import, edit, enable, and delete digital-life records.
		* @returns The 专家 tab panel body.
		*/
		function ExpertsTab({ records, teams, writable, form, loadIdentity, expertApi, t, notify }) {
			const [query, setQuery] = (0, react.useState)("");
			const [category, setCategory] = (0, react.useState)("all");
			const [importOpen, setImportOpen] = (0, react.useState)(false);
			const [library, setLibrary] = (0, react.useState)(false);
			const [editing, setEditing] = (0, react.useState)(void 0);
			const [deleting, setDeleting] = (0, react.useState)(void 0);
			const [acknowledged, setAcknowledged] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const fileInput = (0, react.useRef)(null);
			const ids = new Set(records.map((record) => record.id));
			const needle = query.trim().toLowerCase();
			const visible = records.filter((record) => (category === "all" || record.category === category) && (needle === "" || `${record.name} ${record.id} ${record.tags.join(" ")}`.toLowerCase().includes(needle)));
			const usedCategories = DIGITAL_LIFE_CATEGORIES.filter((value) => records.some((record) => record.category === value));
			const writeRecords = async (next) => form.set("records", next);
			const beginEdit = (record) => {
				setError(void 0);
				setBusy(true);
				loadIdentity(record.id).then((identity) => {
					setEditing({
						record: {
							...record,
							persona: identity,
							...record.toolFilter === void 0 ? {} : { toolFilter: [...record.toolFilter] }
						},
						existing: true
					});
				}).catch((reason) => {
					setError(errorText(reason));
				}).finally(() => {
					setBusy(false);
				});
			};
			const importFile = async (file) => {
				try {
					const record = applyAgentMarkdown(await file.text(), file.name, { ...EMPTY_RECORD });
					if (record === void 0) throw new Error(t("identityError"));
					setEditing({
						record,
						existing: false,
						importedFile: file.name
					});
				} catch (reason) {
					setError(errorText(reason));
				}
			};
			const save = async (draft) => {
				if (editing === void 0) return void 0;
				const next = normalizeDigitalLifeRecord(draft);
				const editingId = editing.existing ? editing.record.id : void 0;
				const nextRecords = editingId === void 0 ? [...records, next] : records.map((record) => record.id === editingId ? next : record);
				try {
					if (!await writeRecords(nextRecords)) return t("writeFailed");
				} catch (reason) {
					return errorText(reason);
				}
				setEditing(void 0);
				notify(t("saved"));
			};
			const toggle = (record, enabled) => {
				writeRecords(records.map((item) => item.id === record.id ? {
					...item,
					enabled
				} : item)).then((saved) => {
					if (!saved) setError(t("writeFailed"));
				}).catch((reason) => {
					setError(errorText(reason));
				});
			};
			const confirmDelete = () => {
				if (deleting === void 0) return;
				setBusy(true);
				writeRecords(records.filter((record) => record.id !== deleting.id)).then((deleted) => {
					if (!deleted) {
						setError(t("writeFailed"));
						return;
					}
					notify(t("deleted"));
				}).catch((reason) => {
					setError(errorText(reason));
				}).finally(() => {
					setBusy(false);
					setDeleting(void 0);
					setAcknowledged(false);
				});
			};
			const referencing = deleting === void 0 ? [] : teamsUsing(deleting.id, teams);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_module_css_default.toolbar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							className: settings_module_css_default.grow ?? "",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 16 }),
							value: query,
							placeholder: t("searchRecords"),
							"aria-label": t("searchRecords"),
							onChange: (event) => {
								setQuery(event.target.value);
							}
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: importOpen,
							onClose: () => {
								setImportOpen(false);
							},
							align: "end",
							portal: true,
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								"aria-haspopup": "menu",
								"aria-expanded": importOpen,
								disabled: !writable,
								onClick: () => {
									setImportOpen((open) => !open);
								},
								children: [t("importMenu"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineMedium, { size: 14 })]
							}),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
								onSelect: () => {
									setImportOpen(false);
									fileInput.current?.click();
								},
								children: t("importFromFile")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
								onSelect: () => {
									setImportOpen(false);
									setLibrary(true);
								},
								children: t("importFromLibrary")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineMedium, { size: 16 }),
							disabled: !writable,
							onClick: () => {
								setError(void 0);
								setEditing({
									record: { ...EMPTY_RECORD },
									existing: false
								});
							},
							children: t("add")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							ref: fileInput,
							className: settings_module_css_default.hiddenFile,
							type: "file",
							accept: ".md,text/markdown,text/plain",
							onChange: (event) => {
								const file = event.target.files?.[0];
								if (file !== void 0) importFile(file);
								event.target.value = "";
							}
						})
					]
				}),
				usedCategories.length < 2 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_module_css_default.filters,
					role: "group",
					"aria-label": t("category"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
						active: category === "all",
						onClick: () => {
							setCategory("all");
						},
						children: t("filterAll")
					}), usedCategories.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
						active: category === value,
						onClick: () => {
							setCategory(value);
						},
						children: categoryLabel({ category: value }, t)
					}, value))]
				}),
				error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: settings_module_css_default.error,
					role: "alert",
					children: error
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: settings_module_css_default.list,
					children: records.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: settings_module_css_default.empty,
						children: t("empty")
					}) : visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: settings_module_css_default.empty,
						children: t("noMatches")
					}) : visible.map((record) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
						className: settings_module_css_default.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_module_css_default.cardMain,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: settings_module_css_default.identity,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: record.name }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
											tone: "neutral",
											children: categoryLabel(record, t)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", {
											className: settings_module_css_default.code,
											children: ["@", record.id]
										}),
										record.expertPackage === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
												tone: "info",
												children: t("expertPublicMethod")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
												tone: "warning",
												children: t("expertUnreviewed")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
												className: settings_module_css_default.code,
												children: record.expertPackage.ref ?? record.expertPackage.revision.slice(0, 7)
											})
										] })
									]
								}),
								record.tags.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: settings_module_css_default.tagRow,
									title: record.tags.join(" · "),
									children: record.tags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
										tone: "outline",
										children: tag
									}, tag))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: settings_module_css_default.preview,
									children: record.description
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_module_css_default.actions,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
									checked: record.enabled,
									label: `${t("enabled")} @${record.id}`,
									title: t("enabled"),
									disabled: !writable,
									onChange: (enabled) => {
										toggle(record, enabled);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 14 }),
									disabled: busy,
									onClick: () => {
										beginEdit(record);
									},
									children: t("edit")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 14 }),
									disabled: !writable || busy,
									onClick: () => {
										setAcknowledged(false);
										setDeleting(record);
									},
									children: t("remove")
								})
							]
						})]
					}, record.id))
				}),
				editing === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExpertEditor, {
					initial: editing.record,
					existing: editing.existing,
					importedFile: editing.importedFile,
					ids,
					t,
					onSave: save,
					onCancel: () => {
						setEditing(void 0);
					}
				}),
				library ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExpertLibraryDialog, {
					api: expertApi,
					writable,
					t,
					onImported: (id) => {
						setLibrary(false);
						notify(t("expertImported", { id }));
					},
					onClose: () => {
						setLibrary(false);
					}
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.RiskConfirmation, {
					open: deleting !== void 0,
					title: t("deleteRecordTitle", { name: deleting?.name ?? "" }),
					description: referencing.length === 0 ? t("deleteRecordDescription", { id: deleting?.id ?? "" }) : t("deleteRecordInUse", {
						id: deleting?.id ?? "",
						teams: referencing.map((team) => team.name).join("、")
					}),
					acknowledgeLabel: t("deleteAcknowledge"),
					cancelLabel: t("cancel"),
					closeLabel: t("close"),
					confirmLabel: t("confirmDelete"),
					acknowledged,
					disabled: busy,
					onAcknowledgedChange: setAcknowledged,
					onCancel: () => {
						setDeleting(void 0);
						setAcknowledged(false);
					},
					onConfirm: confirmDelete
				})
			] });
		}
		//#endregion
		//#region src/client/GeneralTab.tsx
		/**
		* Stage and save the runtime settings shared by every digital life.
		* @returns The 通用设置 tab panel body.
		*/
		function GeneralTab({ form, t }) {
			const [staged, setStaged] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				const model = new _deepseek_ai_dsh_client_ui_primitives.SettingsFormModel(form, [
					(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("stateDir"),
					(0, _deepseek_ai_dsh_client_ui_primitives.settingsTextField)("provider"),
					(0, _deepseek_ai_dsh_client_ui_primitives.settingsNumberField)("maxBatchSize")
				]);
				const store = model.bind(() => ({
					shell: model.shell(),
					fields: {
						stateDir: model.field("stateDir"),
						provider: model.field("provider"),
						maxBatchSize: model.field("maxBatchSize")
					}
				}));
				setStaged({
					model,
					store
				});
				return () => {
					model.dispose();
				};
			}, [form]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_module_css_default.panel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: settings_module_css_default.muted,
					children: t("generalHint")
				}), staged === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GeneralFields, {
					model: staged.model,
					store: staged.store,
					t
				})]
			});
		}
		function GeneralFields({ model, store, t }) {
			const state = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot);
			const actions = model.actions();
			const disabled = !state.shell.writable || state.shell.saving;
			const field = (name, hint, extra) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SettingsValueField, {
				id: `digital-life-${name}`,
				label: t(name),
				hint: t(hint),
				text: state.fields[name].text,
				overridden: state.fields[name].overridden,
				invalid: state.fields[name].invalid,
				overriddenLabel: t("overridden"),
				resetLabel: t("reset"),
				invalidLabel: t("invalidValue"),
				disabled,
				onEdit: (text) => {
					actions.edit(name, text);
				},
				onReset: () => {
					actions.resetField(name);
				},
				...extra
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.SettingsForm, {
				labels: {
					unavailable: t("unavailable"),
					readOnly: t("readOnly"),
					saveFailed: t("saveFailed"),
					save: t("save"),
					saving: t("saving")
				},
				state: state.shell,
				onSave: actions.save,
				onDiscard: actions.discard,
				children: [
					field("stateDir", "stateDirHint", { placeholder: t("stateDirPlaceholder") }),
					field("provider", "providerHint", { placeholder: "spawn" }),
					field("maxBatchSize", "maxBatchSizeHint", {
						numeric: true,
						placeholder: "3"
					})
				]
			});
		}
		//#endregion
		//#region src/client/team-run-view.ts
		const STAGE_ORDER = [
			"brief",
			"analysis",
			"cross-critique",
			"review",
			"synthesis"
		];
		const DISAGREEMENT_ORDER = [
			"fact",
			"assumption",
			"applicability",
			"value"
		];
		/** Format milliseconds as m:ss; mirrors the Host renderer so the two views agree. */
		function clock(ms) {
			const seconds = Math.floor(ms / 1e3);
			return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
		}
		/**
		* Build the task graph: one column per stage kind, one node per member holding their latest attempt.
		* @param now Clock used for the elapsed time of running stages.
		*/
		function stageColumns(run, now = Date.now()) {
			const members = new Map(run.members.map((member) => [member.id, member]));
			return STAGE_ORDER.map((kind) => {
				const latest = /* @__PURE__ */ new Map();
				for (const stage of run.stages) {
					if (stage.kind !== kind) continue;
					const end = stage.finishedAt === void 0 ? now : Date.parse(stage.finishedAt);
					latest.set(stage.expertId, {
						stage,
						member: members.get(stage.expertId),
						attempts: (latest.get(stage.expertId)?.attempts ?? 0) + 1,
						durationMs: Math.max(0, end - Date.parse(stage.startedAt))
					});
				}
				return {
					kind,
					nodes: [...latest.values()]
				};
			});
		}
		/** Group synthesis disagreements by type, in fact → assumption → applicability → value order. */
		function groupDisagreements(report) {
			return DISAGREEMENT_ORDER.map((type) => ({
				type,
				items: report.disagreements.filter((item) => item.type === type)
			})).filter((group) => group.items.length > 0);
		}
		/** Budget usage as display fragments, e.g. calls "6/10" and time "3:12/10:00". */
		function budgetUsage(run) {
			const { callsUsed, maxCalls, activeMs, maxActiveMs } = run.budget;
			return {
				calls: `${callsUsed}/${maxCalls}`,
				time: `${clock(activeMs)}/${clock(maxActiveMs)}`
			};
		}
		/** The most recent completed synthesis report, if any. */
		function latestSynthesis(run) {
			return run.stages.findLast((item) => item.kind === "synthesis" && item.status === "completed")?.report;
		}
		const bullets = (items) => items.map((item) => `- ${item}`);
		/** Markdown lines for the expanded node; empty when the stage has no report. */
		function stageLines(stage) {
			const report = stage.report;
			if (report === void 0) return [];
			if (stage.kind === "brief") {
				const brief = report;
				return [
					brief.objective,
					...bullets(brief.acceptanceCriteria),
					...bullets(brief.constraints),
					...bullets(brief.clarifyingQuestions)
				];
			}
			if (stage.kind === "cross-critique") {
				const critique = report;
				return [critique.summary, ...critique.items.map((item) => `- [${item.kind}] ${item.targetStageId}: ${item.issue}`)];
			}
			const review = report;
			const lines = [
				review.summary,
				...review.findings.map((finding) => `- [${finding.kind}] ${finding.claim}`),
				...bullets(review.assumptions),
				...bullets(review.nextActions)
			];
			if (stage.kind !== "synthesis") return [...lines, ...bullets(review.disagreements)];
			const synthesis = review;
			return [
				...lines,
				...bullets(synthesis.options.map((option) => `${option.name}: ${option.tradeoffs}`)),
				...bullets(synthesis.validationPlan.map((item) => `${item.task} -> decides ${item.decides}; stop when ${item.stopCondition}`)),
				...bullets(synthesis.missingStages)
			];
		}
		//#endregion
		//#region src/client/TeamRunView.tsx
		const STAGE_KEYS = {
			brief: "stageBrief",
			analysis: "stageAnalysis",
			"cross-critique": "stageCrossCritique",
			review: "stageReview",
			synthesis: "stageSynthesis"
		};
		const NODE_KEYS = {
			running: "reviewRunning",
			completed: "reviewCompleted",
			failed: "reviewFailed",
			cancelled: "reviewCancelled"
		};
		const NODE_DOTS = {
			running: "ongoing",
			completed: "done",
			failed: "error",
			cancelled: "idle"
		};
		const TYPE_KEYS = {
			fact: "disagreementFact",
			assumption: "disagreementAssumption",
			applicability: "disagreementApplicability",
			value: "disagreementValue"
		};
		const RESOLUTION_KEYS = {
			"gather-evidence": "resolutionGatherEvidence",
			experiment: "resolutionExperiment",
			"human-decision": "resolutionHumanDecision"
		};
		function SynthesisSection({ run, t, labels }) {
			const synthesis = latestSynthesis(run);
			if (synthesis === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: settings_module_css_default.muted,
				children: t("noSynthesis")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: settings_module_css_default.teamRun,
				"aria-label": t("stageSynthesis"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
						text: synthesis.summary,
						labels
					}),
					groupDisagreements(synthesis).map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.disagreementGroup,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
							tone: "info",
							children: t(TYPE_KEYS[group.type])
						}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: group.items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: item.topic }),
							" · ",
							t(RESOLUTION_KEYS[item.resolution]),
							item.test === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [" · ", t("disagreementTest", { test: item.test })] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: item.positions.map((position) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
								position.stageId,
								": ",
								position.position
							] }, position.stageId)) })
						] }, item.topic)) })]
					}, group.type)),
					synthesis.missingStages.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_module_css_default.muted,
						children: t("missingStagesNote", { stages: synthesis.missingStages.join(", ") })
					})
				]
			});
		}
		/**
		* Show a v2 team run: status and budget with cancel, the synthesis first, then the stage graph.
		* @returns The run view placed inside the review report dialog.
		*/
		function TeamRunView({ run, t, labels, statusLabel, busy, onCancel }) {
			const [expanded, setExpanded] = (0, react.useState)(void 0);
			const usage = budgetUsage(run);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_module_css_default.teamRun,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.teamRunHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							statusLabel,
							" · ",
							t("teamRunBudget", usage)
						] }), onCancel === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							disabled: busy,
							onClick: onCancel,
							children: t("cancelReview")
						})]
					}),
					run.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_module_css_default.error,
						role: "alert",
						children: run.error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SynthesisSection, {
						run,
						t,
						labels
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: settings_module_css_default.stageGraph,
						"aria-label": t("teamRunGraph"),
						children: stageColumns(run).map((column) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: settings_module_css_default.stageColumn,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: settings_module_css_default.label,
									children: t(STAGE_KEYS[column.kind])
								}),
								column.nodes.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
									className: settings_module_css_default.muted,
									children: t("stageSkipped")
								}) : null,
								column.nodes.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: settings_module_css_default.stageNode,
									"aria-expanded": expanded === node.stage.id,
									onClick: () => {
										setExpanded(expanded === node.stage.id ? void 0 : node.stage.id);
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: NODE_DOTS[node.stage.status] }),
											" ",
											node.member?.name ?? node.stage.expertId
										] }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: node.member?.responsibility ?? "" }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
											t(NODE_KEYS[node.stage.status]),
											" · ",
											clock(node.durationMs),
											node.attempts > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [" · ", t("stageAttempts", { count: String(node.attempts) })] }) : null
										] }),
										node.stage.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
											className: settings_module_css_default.error,
											children: node.stage.error
										})
									]
								}, node.stage.id))
							]
						}, column.kind))
					}),
					(() => {
						const stage = run.stages.find((item) => item.id === expanded);
						if (stage === void 0) return null;
						const lines = stageLines(stage);
						return lines.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: settings_module_css_default.muted,
							children: t("stageNoReport")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
							text: lines.join("\n\n"),
							labels
						});
					})()
				]
			});
		}
		//#endregion
		//#region src/client/ReviewHistory.tsx
		const STATUS_KEYS = {
			open: "reviewOpen",
			running: "reviewRunning",
			completed: "reviewCompleted",
			partial: "reviewPartial",
			failed: "reviewFailed",
			cancelled: "reviewCancelled",
			"timed-out": "reviewTimedOut",
			expired: "reviewExpired"
		};
		const STATUS_DOTS = {
			open: "ongoing",
			running: "ongoing",
			completed: "done",
			partial: "warning",
			failed: "error",
			cancelled: "idle",
			"timed-out": "warning",
			expired: "idle"
		};
		const POLL_MS = 2e3;
		/** Statuses that still allow cancel and keep the list polling. */
		const LIVE = /* @__PURE__ */ new Set(["open", "running"]);
		const briefOf = (run) => run.schemaVersion === 2 ? run.briefs[0]?.text ?? "" : run.request.question;
		/**
		* List past plan reviews, poll while any is running, and open or export reports.
		* @returns The review history block.
		*/
		function ReviewHistory({ api, t }) {
			const [reviews, setReviews] = (0, react.useState)([]);
			const [report, setReport] = (0, react.useState)(void 0);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const hasRunning = reviews.some((run) => LIVE.has(run.status));
			(0, react.useEffect)(() => {
				let mounted = true;
				const refresh = () => {
					api.listReviews().then((value) => {
						if (mounted) setReviews(value);
					}).catch((reason) => {
						if (mounted) setError(errorText(reason));
					});
				};
				refresh();
				const timer = hasRunning ? setInterval(refresh, POLL_MS) : void 0;
				return () => {
					mounted = false;
					clearInterval(timer);
				};
			}, [api, hasRunning]);
			const reportLive = report !== void 0 && LIVE.has(report.run.status);
			const reportId = report?.run.id;
			(0, react.useEffect)(() => {
				if (!reportLive || reportId === void 0) return;
				const timer = setInterval(() => {
					api.readReview(reportId).then(setReport).catch((reason) => {
						setError(errorText(reason));
					});
				}, POLL_MS);
				return () => {
					clearInterval(timer);
				};
			}, [
				api,
				reportLive,
				reportId
			]);
			const perform = (action) => {
				setBusy(true);
				setError(void 0);
				action().catch((reason) => {
					setError(errorText(reason));
				}).finally(() => {
					setBusy(false);
				});
			};
			const download = (kind) => {
				if (report === void 0) return;
				const blob = new Blob([kind === "md" ? report.markdown : JSON.stringify(report.run, null, 2)], { type: "text/plain;charset=utf-8" });
				const url = URL.createObjectURL(blob);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = `${report.run.id}.${kind}`;
				anchor.click();
				setTimeout(() => {
					URL.revokeObjectURL(url);
				}, 1e3);
			};
			const cancel = (id) => {
				perform(async () => {
					await api.cancelReview(id);
					setReviews(await api.listReviews());
					if (report?.run.id === id) setReport(await api.readReview(id));
				});
			};
			const labels = {
				code: {
					copyLabel: t("copyCode"),
					copiedLabel: t("copiedCode")
				},
				footnotes: t("footnotes")
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: settings_module_css_default.block,
				"aria-labelledby": "digital-life-history-title",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.blockHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							id: "digital-life-history-title",
							children: t("reviewHistory")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 14 }),
							disabled: busy,
							onClick: () => {
								perform(async () => {
									setReviews(await api.listReviews());
								});
							},
							children: t("refreshReviews")
						})]
					}),
					error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_module_css_default.error,
						role: "alert",
						children: error
					}),
					reviews.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_module_css_default.muted,
						children: t("noReviews")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: reviews.map((run) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.reviewRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: STATUS_DOTS[run.status] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.reviewMain,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									title: run.question,
									children: run.question
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
									t(STATUS_KEYS[run.status]),
									" · ",
									new Date(run.createdAt).toLocaleString()
								] })]
							}),
							LIVE.has(run.status) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								disabled: busy,
								onClick: () => {
									cancel(run.id);
								},
								children: t("cancelReview")
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "outline",
								disabled: busy,
								onClick: () => {
									api.openReviewSession(run.sessionId);
								},
								children: t("enterSession")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "outline",
								disabled: busy,
								onClick: () => {
									perform(async () => {
										setReport(await api.readReview(run.id));
									});
								},
								children: t("openReport")
							})
						]
					}, run.id)) }),
					report === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: true,
						onClose: () => {
							setReport(void 0);
						},
						title: t("reportTitle"),
						description: briefOf(report.run),
						closeLabel: t("close"),
						className: settings_module_css_default.dialog ?? "",
						contentClassName: settings_module_css_default.dialogContent ?? "",
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { size: 16 }),
							onClick: () => {
								download("md");
							},
							children: t("exportReviewMarkdown")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutlineRegular, { size: 16 }),
							onClick: () => {
								download("json");
							},
							children: t("exportReviewJson")
						})] }),
						children: report.run.schemaVersion === 2 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TeamRunView, {
							run: report.run,
							t,
							labels,
							statusLabel: t(STATUS_KEYS[report.run.status]),
							busy,
							onCancel: LIVE.has(report.run.status) ? () => {
								cancel(report.run.id);
							} : void 0
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
							text: report.markdown,
							labels
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/TeamEditor.tsx
		const REASON_KEYS = {
			required: "required",
			invalidId: "invalidId",
			duplicateId: "duplicateId",
			analystCount: "analystCount",
			idConflict: "teamIdConflict",
			responsibilityLength: "responsibilityLength",
			teamPersonaLength: "teamPersonaLength"
		};
		const BY_REVIEWER = "__reviewer__";
		/**
		* Add or edit one expert team in a dialog.
		* @returns The team editor dialog.
		*/
		function TeamEditor({ initial, existing, records, teams, t, onSave, onCancel }) {
			const [draft, setDraft] = (0, react.useState)(initial);
			const [idTouched, setIdTouched] = (0, react.useState)(existing || initial.id !== "");
			const [invalid, setInvalid] = (0, react.useState)(void 0);
			const [error, setError] = (0, react.useState)(void 0);
			const [saving, setSaving] = (0, react.useState)(false);
			const update = (patch, field) => {
				setDraft((current) => ({
					...current,
					...patch
				}));
				if (field !== void 0 && field === invalid) setInvalid(void 0);
			};
			const toggleAnalyst = (id, checked) => {
				update({ analystIds: checked ? [...draft.analystIds, id] : draft.analystIds.filter((item) => item !== id) }, "analystIds");
			};
			const save = () => {
				const team = normalizeTeam(draft);
				const problem = teamError(team, teams, existing ? initial.id : void 0, records.map((record) => record.id));
				if (problem !== void 0) {
					setInvalid(problem.field);
					setError(problem.field === "reviewerId" && problem.reason === "required" ? t("reviewerRequired") : problem.reason === "required" ? t("required") : t(REASON_KEYS[problem.reason]));
					return;
				}
				setSaving(true);
				setError(void 0);
				onSave(team).then((message) => {
					if (message !== void 0) setError(message);
				}).finally(() => {
					setSaving(false);
				});
			};
			const controlClass = (field) => `${settings_module_css_default.control} ${invalid === field ? settings_module_css_default.invalid : ""}`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: onCancel,
				title: existing ? t("dialogEditTeam") : t("dialogAddTeam"),
				closeLabel: t("close"),
				className: settings_module_css_default.dialog ?? "",
				contentClassName: settings_module_css_default.dialogContent ?? "",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${settings_module_css_default.error} ${settings_module_css_default.grow}`,
						role: "alert",
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: onCancel,
						children: t("cancel")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						onClick: save,
						disabled: saving,
						children: saving ? t("saving") : t("save")
					})
				] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_module_css_default.form,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: settings_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("teamName")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: controlClass("name"),
								value: draft.name,
								placeholder: t("teamNamePlaceholder"),
								"data-modal-autofocus": "",
								onChange: (event) => {
									const name = event.target.value;
									update(idTouched ? { name } : {
										name,
										id: suggestTeamId(name, teams)
									}, "name");
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: settings_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("teamId")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: controlClass("id"),
								value: draft.id,
								placeholder: "team",
								disabled: existing,
								readOnly: existing,
								onChange: (event) => {
									setIdTouched(true);
									update({ id: event.target.value }, "id");
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("teamPurpose")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								className: settings_module_css_default.control ?? "",
								value: draft.purpose,
								placeholder: t("teamPurposePlaceholder"),
								onChange: (event) => {
									update({ purpose: event.target.value });
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: settings_module_css_default.label,
									children: t("teamPersona")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: `${settings_module_css_default.textarea} ${invalid === "persona" ? settings_module_css_default.invalid : ""}`,
									rows: 6,
									maxLength: TEAM_PERSONA_LIMIT,
									value: draft.persona ?? "",
									placeholder: t("teamPersonaPlaceholder"),
									onChange: (event) => {
										update({ persona: event.target.value }, "persona");
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: settings_module_css_default.hint,
									children: t("teamPersonaHint")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							role: "group",
							"aria-label": t("reviewAnalyst"),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: settings_module_css_default.label,
									children: t("reviewAnalyst")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnalystChecks, {
									records,
									selected: draft.analystIds,
									excluded: draft.reviewerId,
									onToggle: toggleAnalyst
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `${settings_module_css_default.hint} ${invalid === "analystIds" ? settings_module_css_default.fieldError : ""}`,
									children: t("analystLimit")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("reviewReviewer")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuSelect, {
								value: draft.reviewerId,
								placeholder: t("chooseExpert"),
								invalid: invalid === "reviewerId",
								options: records.filter((record) => !draft.analystIds.includes(record.id)).map((record) => ({
									value: record.id,
									label: `${record.name} @${record.id}`
								})),
								onChange: (reviewerId) => {
									update({ reviewerId }, "reviewerId");
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("teamCoordinator")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuSelect, {
								value: draft.coordinatorId ?? BY_REVIEWER,
								placeholder: t("coordinatorByReviewer"),
								options: [{
									value: BY_REVIEWER,
									label: t("coordinatorByReviewer")
								}, ...records.map((record) => ({
									value: record.id,
									label: `${record.name} @${record.id}`
								}))],
								onChange: (coordinatorId) => {
									const { coordinatorId: _previous, ...rest } = draft;
									setDraft(coordinatorId === BY_REVIEWER ? rest : {
										...rest,
										coordinatorId
									});
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							role: "group",
							"aria-label": t("teamResponsibilities"),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: settings_module_css_default.label,
									children: t("teamResponsibilities")
								}),
								[.../* @__PURE__ */ new Set([
									...draft.analystIds,
									draft.reviewerId,
									draft.coordinatorId ?? ""
								])].filter((id) => id !== "").map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									className: controlClass("responsibilities"),
									"aria-label": t("responsibilityFor", { id }),
									value: draft.responsibilities?.[id] ?? "",
									maxLength: 200,
									placeholder: t("responsibilityPlaceholder", { id }),
									onChange: (event) => {
										update({ responsibilities: {
											...draft.responsibilities,
											[id]: event.target.value
										} }, "responsibilities");
									}
								}, id)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `${settings_module_css_default.hint} ${invalid === "responsibilities" ? settings_module_css_default.fieldError : ""}`,
									children: t("responsibilityHint")
								})
							]
						})
					]
				})
			});
		}
		/**
		* Checkbox grid choosing up to {@link MAX_ANALYSTS} analysts.
		* @returns One checkbox per record; the reviewer and, once full, unchecked records are disabled.
		*/
		function AnalystChecks({ records, selected, excluded, disabled = false, onToggle }) {
			const full = selected.length >= 3;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: settings_module_css_default.checks,
				children: records.map((record) => {
					const checked = selected.includes(record.id);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Checkbox, {
						checked,
						label: `${record.name} @${record.id}`,
						disabled: disabled || record.id === excluded || !checked && full,
						onChange: (next) => {
							onToggle(record.id, next);
						}
					}, record.id);
				})
			});
		}
		//#endregion
		//#region src/client/ReviewLauncher.tsx
		const BRIEF_LIMIT = 2e4;
		/**
		* Pick a lineup and a brief, then ask the Agent to run a plan review.
		* @returns The review launcher block.
		*/
		function ReviewLauncher({ api, records, teams, mode, teamId, t, onModeChange, onTeamChange, onSaveAsTeam, notify }) {
			const [analystIds, setAnalystIds] = (0, react.useState)([]);
			const [reviewerId, setReviewerId] = (0, react.useState)("");
			const [question, setQuestion] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const enabled = records.filter((record) => record.enabled);
			const enabledIds = new Set(enabled.map((record) => record.id));
			const team = teams.find((item) => item.id === teamId);
			const issues = team === void 0 ? [] : teamIssues(team, records);
			const adhoc = {
				analystIds: analystIds.filter((id) => enabledIds.has(id) && id !== reviewerId),
				reviewerId: enabledIds.has(reviewerId) ? reviewerId : ""
			};
			const adhocReady = adhoc.analystIds.length >= 1 && adhoc.analystIds.length <= 3 && adhoc.reviewerId !== "";
			const lineup = mode === "team" ? team !== void 0 && issues.length === 0 ? team : void 0 : adhocReady ? adhoc : void 0;
			const canStart = !busy && lineup !== void 0 && question.trim() !== "";
			const start = () => {
				if (lineup === void 0) return;
				setBusy(true);
				setError(void 0);
				api.startReview(requestFromTeam(lineup, question, mode === "team" ? teamId : void 0)).then(() => {
					notify(t("reviewSubmitted"));
				}).catch((reason) => {
					setError(errorText(reason));
				}).finally(() => {
					setBusy(false);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: settings_module_css_default.block,
				"aria-labelledby": "digital-life-review-title",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.blockHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							id: "digital-life-review-title",
							children: t("planReview")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedControl, {
							id: "digital-life-launch-mode",
							label: t("launchMode"),
							value: mode,
							options: [{
								value: "team",
								label: t("launchTeam")
							}, {
								value: "adhoc",
								label: t("launchAdhoc")
							}],
							onChange: onModeChange
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_module_css_default.muted,
						children: t("planReviewHint")
					}),
					mode === "team" ? teams.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_module_css_default.muted,
						children: t("noTeamsToLaunch")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.field,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("chooseTeam")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuSelect, {
								value: teamId,
								placeholder: t("chooseTeam"),
								options: teams.map((item) => ({
									value: item.id,
									label: item.name
								})),
								onChange: onTeamChange
							}),
							issues.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${settings_module_css_default.hint} ${settings_module_css_default.fieldError}`,
								children: t("lineupBlocked")
							})
						]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.form,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							role: "group",
							"aria-label": t("reviewAnalyst"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("reviewAnalyst")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnalystChecks, {
								records: enabled,
								selected: adhoc.analystIds,
								excluded: adhoc.reviewerId,
								disabled: busy,
								onToggle: (id, checked) => {
									setAnalystIds(checked ? [...adhoc.analystIds, id] : adhoc.analystIds.filter((item) => item !== id));
								}
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${settings_module_css_default.field} ${settings_module_css_default.full}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: settings_module_css_default.label,
								children: t("reviewReviewer")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenuSelect, {
								value: adhoc.reviewerId,
								placeholder: t("chooseExpert"),
								disabled: busy,
								options: enabled.filter((record) => !adhoc.analystIds.includes(record.id)).map((record) => ({
									value: record.id,
									label: `${record.name} @${record.id}`
								})),
								onChange: setReviewerId
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: settings_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: settings_module_css_default.label,
							children: t("reviewBrief")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: settings_module_css_default.textarea,
							rows: 5,
							maxLength: BRIEF_LIMIT,
							value: question,
							disabled: busy,
							onChange: (event) => {
								setQuestion(event.target.value);
							}
						})]
					}),
					error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: settings_module_css_default.error,
						role: "alert",
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: settings_module_css_default.toolbar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: settings_module_css_default.grow }),
							mode === "adhoc" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								disabled: !adhocReady,
								onClick: () => {
									onSaveAsTeam(adhoc);
								},
								children: t("saveAsTeam")
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutlineRegular, { size: 16 }),
								disabled: !canStart,
								onClick: start,
								children: t("startPlanReview")
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/TeamsTab.tsx
		const EMPTY_TEAM = {
			id: "",
			name: "",
			purpose: "",
			analystIds: [],
			reviewerId: ""
		};
		/**
		* Manage saved expert teams and launch plan reviews with a team or an ad-hoc lineup.
		* @returns The 专家团 tab panel body.
		*/
		function TeamsTab({ records, teams, writable, form, expertApi, stateDir, t, notify }) {
			const [editing, setEditing] = (0, react.useState)(void 0);
			const [deleting, setDeleting] = (0, react.useState)(void 0);
			const [acknowledged, setAcknowledged] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const [mode, setMode] = (0, react.useState)(teams.length === 0 ? "adhoc" : "team");
			const [teamId, setTeamId] = (0, react.useState)(teams[0]?.id ?? "");
			const names = new Map(records.map((record) => [record.id, record.name]));
			const nameOf = (id) => names.get(id) ?? `@${id}`;
			const writeTeams = async (next) => form.set("teams", next);
			const save = async (team) => {
				if (editing === void 0) return void 0;
				const editingId = editing.existing ? editing.team.id : void 0;
				const next = editingId === void 0 ? [...teams, team] : teams.map((item) => item.id === editingId ? team : item);
				try {
					if (!await writeTeams(next)) return t("writeFailed");
				} catch (reason) {
					return errorText(reason);
				}
				setEditing(void 0);
				setTeamId(team.id);
				setMode("team");
				notify(t("teamSaved"));
			};
			const confirmDelete = () => {
				if (deleting === void 0) return;
				setBusy(true);
				writeTeams(teams.filter((team) => team.id !== deleting.id)).then((deleted) => {
					if (!deleted) {
						setError(t("writeFailed"));
						return;
					}
					notify(t("teamDeleted"));
				}).catch((reason) => {
					setError(errorText(reason));
				}).finally(() => {
					setBusy(false);
					setDeleting(void 0);
					setAcknowledged(false);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_module_css_default.toolbar,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: `${settings_module_css_default.muted} ${settings_module_css_default.grow}`,
						children: t("teamsHint")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineMedium, { size: 16 }),
						disabled: !writable,
						onClick: () => {
							setError(void 0);
							setEditing({
								team: {
									...EMPTY_TEAM,
									analystIds: []
								},
								existing: false
							});
						},
						children: t("addTeam")
					})]
				}),
				error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: settings_module_css_default.error,
					role: "alert",
					children: error
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: settings_module_css_default.list,
					children: teams.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: settings_module_css_default.empty,
						children: t("emptyTeams")
					}) : teams.map((team) => {
						const issues = teamIssues(team, records);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
							className: settings_module_css_default.card,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.cardMain,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_module_css_default.identity,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: team.name }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
												className: settings_module_css_default.code,
												children: team.id
											}),
											issues.map((issue) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
												tone: "warning",
												children: t(issue.kind === "missing" ? "issueMissing" : "issueDisabled", { id: issue.id })
											}, issue.id)),
											records.some((record) => record.id === team.id) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
												tone: "warning",
												children: t("teamIdShadowed", { id: team.id })
											}) : null
										]
									}),
									team.purpose === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: settings_module_css_default.preview,
										children: team.purpose
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
										className: settings_module_css_default.muted,
										children: [
											t("teamAnalysts", { names: team.analystIds.map(nameOf).join("、") }),
											" ·",
											" ",
											t("teamReviewer", { name: nameOf(team.reviewerId) }),
											team.coordinatorId === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [" · ", t("teamCoordinatorName", { name: nameOf(team.coordinatorId) })] })
										]
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: settings_module_css_default.actions,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlayOutlineRegular, { size: 14 }),
										disabled: issues.length > 0,
										onClick: () => {
											setMode("team");
											setTeamId(team.id);
											document.getElementById("digital-life-review-title")?.scrollIntoView({ block: "start" });
										},
										children: t("useTeam")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 14 }),
										disabled: !writable,
										onClick: () => {
											setError(void 0);
											setEditing({
												team: {
													...team,
													analystIds: [...team.analystIds]
												},
												existing: true
											});
										},
										children: t("edit")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 14 }),
										disabled: !writable || busy,
										onClick: () => {
											setAcknowledged(false);
											setDeleting(team);
										},
										children: t("remove")
									})
								]
							})]
						}, team.id);
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReviewLauncher, {
					api: expertApi,
					records,
					teams,
					mode,
					teamId,
					t,
					onModeChange: setMode,
					onTeamChange: setTeamId,
					onSaveAsTeam: (lineup) => {
						setError(void 0);
						setEditing({
							team: {
								...EMPTY_TEAM,
								analystIds: [...lineup.analystIds],
								reviewerId: lineup.reviewerId
							},
							existing: false
						});
					},
					notify
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReviewHistory, {
					api: expertApi,
					t
				}, stateDir),
				editing === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TeamEditor, {
					initial: editing.team,
					existing: editing.existing,
					records,
					teams,
					t,
					onSave: save,
					onCancel: () => {
						setEditing(void 0);
					}
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.RiskConfirmation, {
					open: deleting !== void 0,
					title: t("deleteTeamTitle", { name: deleting?.name ?? "" }),
					description: t("deleteTeamDescription"),
					acknowledgeLabel: t("deleteAcknowledge"),
					cancelLabel: t("cancel"),
					closeLabel: t("close"),
					confirmLabel: t("confirmDelete"),
					acknowledged,
					disabled: busy,
					onAcknowledgedChange: setAcknowledged,
					onCancel: () => {
						setDeleting(void 0);
						setAcknowledged(false);
					},
					onConfirm: confirmDelete
				})
			] });
		}
		//#endregion
		//#region src/client/DigitalLifeSettingSection.tsx
		const tabIds = (value) => ({
			id: `digital-life-tab-${value}`,
			panelId: `digital-life-panel-${value}`
		});
		const tabLabel = (icon, text) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
			className: settings_module_css_default.tabLabel,
			children: [icon, text]
		});
		/** Render the digital-life settings as 专家 / 专家团 / 通用设置 tabs. */
		function DigitalLifeSettingSection(props) {
			const t = props.t;
			const snapshot = props.useSettings((value) => value);
			const [tab, setTab] = (0, react.useState)("experts");
			const [toast, setToast] = (0, react.useState)(void 0);
			const settings = snapshot.value;
			if (snapshot.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				className: settings_module_css_default.section,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: settings_module_css_default.muted,
					children: t("loading")
				})
			});
			if (snapshot.status !== "ready" || settings === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				className: settings_module_css_default.section,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: settings_module_css_default.header,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("title") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("unavailable") })]
				})
			});
			const records = (settings.records ?? []).map((record) => ({
				...record,
				description: record.description?.trim() || record.name,
				tags: record.tags ?? (record.tag?.trim() ? [record.tag.trim()] : [])
			}));
			const teams = settings.teams ?? [];
			const notify = (text) => {
				setToast({
					text,
					key: Date.now()
				});
			};
			const items = [
				{
					value: "experts",
					label: tabLabel(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutlineRegular, { size: 16 }), t("tabExperts")),
					...tabIds("experts")
				},
				{
					value: "teams",
					label: tabLabel(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUsersOutlineRegular, { size: 16 }), t("tabTeams")),
					...tabIds("teams")
				},
				{
					value: "general",
					label: tabLabel(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSlidersTwoOutlineRegular, { size: 16 }), t("tabGeneral")),
					...tabIds("general")
				}
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: settings_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: settings_module_css_default.header,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("title") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("intro") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.SegmentedTabs, {
						items,
						value: tab,
						onChange: setTab,
						label: t("tabsLabel")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: settings_module_css_default.panel,
						role: "tabpanel",
						id: tabIds(tab).panelId,
						"aria-labelledby": tabIds(tab).id,
						tabIndex: 0,
						children: tab === "experts" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExpertsTab, {
							records,
							teams,
							writable: snapshot.writable,
							form: props.form,
							loadIdentity: props.loadIdentity,
							expertApi: props.expertApi,
							t,
							notify
						}) : tab === "teams" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TeamsTab, {
							records,
							teams,
							writable: snapshot.writable,
							form: props.form,
							expertApi: props.expertApi,
							stateDir: settings.stateDir ?? "",
							t,
							notify
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GeneralTab, {
							form: props.form,
							t
						})
					}),
					toast === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: toast.text,
						tone: "success",
						onDone: () => {
							setToast(void 0);
						}
					}, toast.key)
				]
			});
		}
		//#endregion
		//#region \0dsh-digital-life-css:/Users/elon/code-space/GitHub/dsh-digital-life/src/client/ChatPanel.module.css.mjs
		const css$1 = "div:has([data-digital-life-chat]){flex-direction:column}.GMxQQG_root{box-sizing:border-box;flex:none;align-items:center;width:calc(100% + 4px);height:42px;margin:4px -2px;display:flex;position:relative}.GMxQQG_trigger{box-sizing:border-box;border-radius:var(--dsw-radius-md);width:auto;min-width:0;height:42px;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:0 0;border:none;flex:1;align-items:center;gap:8px;margin:0;padding:0 10px 0 8px;font-family:inherit;font-size:14px;line-height:22px;display:flex;overflow:hidden}.GMxQQG_trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}.GMxQQG_railRoot{width:36px;height:36px;margin:8px 0 10px}.GMxQQG_rail{border-radius:50%;flex:none;justify-content:center;gap:0;width:36px;height:36px;padding:0}.GMxQQG_triggerLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.GMxQQG_chevron{color:var(--dsw-alias-label-tertiary);flex:none;margin-left:auto}.GMxQQG_panel{z-index:1200;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);pointer-events:auto;border-radius:12px;width:100%;padding:8px;position:absolute;bottom:50px;left:0;box-shadow:0 16px 44px #0000003d}.GMxQQG_title{color:var(--dsw-alias-label-tertiary);padding:4px 8px 7px;font-size:11px}.GMxQQG_error{color:var(--dsw-alias-label-error);padding:4px 8px 7px;font-size:12px}.GMxQQG_action{width:100%;min-height:36px;color:var(--dsw-alias-label-primary);text-align:left;font:inherit;cursor:pointer;background:0 0;border:0;border-radius:8px;align-items:center;gap:9px;padding:5px 8px;display:flex}.GMxQQG_action:hover{background:var(--dsw-alias-interactive-bg-hover)}.GMxQQG_icon,.GMxQQG_avatar{background:var(--dsw-alias-fill-tsp-secondary);border-radius:8px;flex:0 0 24px;place-items:center;width:24px;height:24px;font-size:12px;display:grid}.GMxQQG_text{flex-direction:column;min-width:0;display:flex}.GMxQQG_text strong{text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:500;line-height:17px;overflow:hidden}.GMxQQG_text small{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:15px}";
		const tagId$1 = "dsh-digital-life/ChatPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-digital-life";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var ChatPanel_module_css_default = {
			"action": "GMxQQG_action",
			"avatar": "GMxQQG_avatar",
			"chevron": "GMxQQG_chevron",
			"error": "GMxQQG_error",
			"icon": "GMxQQG_icon",
			"panel": "GMxQQG_panel",
			"rail": "GMxQQG_rail",
			"railRoot": "GMxQQG_railRoot",
			"root": "GMxQQG_root",
			"text": "GMxQQG_text",
			"title": "GMxQQG_title",
			"trigger": "GMxQQG_trigger",
			"triggerLabel": "GMxQQG_triggerLabel"
		};
		//#endregion
		//#region src/client/ChatPanel.tsx
		function ChatPanel({ wide, records, createSession, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
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
				setError(void 0);
				createSession(record).catch((error) => {
					console.error("digital-life: failed to start standalone session", error);
					setError(error instanceof Error ? error.message : String(error));
					setOpen(true);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: root,
				"data-digital-life-chat": wide ? "wide" : "rail",
				className: `${ChatPanel_module_css_default.root} ${wide ? "" : ChatPanel_module_css_default.railRoot}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: `${ChatPanel_module_css_default.trigger} ${wide ? "" : ChatPanel_module_css_default.rail}`,
					"aria-label": t("chatAria"),
					"aria-expanded": open,
					onClick: () => {
						if (wide) setOpen((value) => !value);
						else start();
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUsersOutlineMedium, { size: wide ? 16 : 18 }),
						wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ChatPanel_module_css_default.triggerLabel,
							children: t("chat")
						}),
						wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineMedium, { className: ChatPanel_module_css_default.chevron })
					]
				}), wide && open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: ChatPanel_module_css_default.panel,
					"aria-label": t("startSessionAria"),
					children: [
						error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ChatPanel_module_css_default.error,
							role: "alert",
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ChatPanel_module_css_default.title,
							children: t("startSession")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: ChatPanel_module_css_default.action,
							onClick: () => {
								start();
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ChatPanel_module_css_default.icon,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutlineRegular, { size: 14 })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("newSession") })]
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
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: record.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: categoryLabel(record, t) })]
							})]
						}, record.id))
					]
				})]
			});
		}
		//#endregion
		//#region \0dsh-digital-life-css:/Users/elon/code-space/GitHub/dsh-digital-life/src/client/AgentPresetSelector.module.css.mjs
		const css = ".HW1xEW_root{align-items:center;gap:2px;min-width:0;display:flex}.HW1xEW_error{color:var(--dsw-alias-label-tertiary);font-size:12px}.HW1xEW_seatWrap{min-width:54px}.HW1xEW_presetWrap{flex-shrink:12}.HW1xEW_lifeWrap{flex-shrink:1}.HW1xEW_seat{max-width:min(100%,240px);min-height:28px;color:var(--dsw-alias-label-primary);white-space:nowrap;cursor:pointer;background:0 0;border:none;border-radius:16px;align-items:center;gap:4px;padding:0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex;overflow:hidden}.HW1xEW_seat:not(:disabled):hover,.HW1xEW_seat[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}.HW1xEW_seat:disabled{cursor:default;color:var(--dsw-alias-label-quaternary)}.HW1xEW_seatLabel{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.HW1xEW_icon{color:var(--dsw-alias-label-primary);flex:none}.HW1xEW_chevron{color:var(--dsw-alias-label-caption);flex:none}.HW1xEW_item{flex-direction:column;gap:2px;max-width:min(280px,100vw - 64px);display:flex}.HW1xEW_itemName{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}.HW1xEW_itemDesc{color:var(--dsw-alias-label-caption);white-space:normal;font-size:12px;line-height:16px}@media (width<=430px){.HW1xEW_root:has(.HW1xEW_lifeWrap) .HW1xEW_presetWrap .HW1xEW_seatLabel{display:none}}";
		const tagId = "dsh-digital-life/AgentPresetSelector.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-digital-life";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var AgentPresetSelector_module_css_default = {
			"chevron": "HW1xEW_chevron",
			"error": "HW1xEW_error",
			"icon": "HW1xEW_icon",
			"item": "HW1xEW_item",
			"itemDesc": "HW1xEW_itemDesc",
			"itemName": "HW1xEW_itemName",
			"lifeWrap": "HW1xEW_lifeWrap",
			"presetWrap": "HW1xEW_presetWrap",
			"root": "HW1xEW_root",
			"seat": "HW1xEW_seat",
			"seatLabel": "HW1xEW_seatLabel",
			"seatWrap": "HW1xEW_seatWrap"
		};
		//#endregion
		//#region src/client/AgentPresetSelector.tsx
		/** Render the Harness-styled Agent preset and digital-life selectors. */
		function AgentPresetSelector({ load, select, records, selectLife, developerTools, t }) {
			const developerToolsEnabled = (0, react.useSyncExternalStore)(developerTools.subscribe, developerTools.getSnapshot, developerTools.getSnapshot);
			const [options, setOptions] = (0, react.useState)([]);
			const [current, setCurrent] = (0, react.useState)("");
			const [life, setLife] = (0, react.useState)("");
			const [team, setTeam] = (0, react.useState)("");
			const [presetOpen, setPresetOpen] = (0, react.useState)(false);
			const [lifeOpen, setLifeOpen] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [loadError, setLoadError] = (0, react.useState)();
			(0, react.useEffect)(() => {
				if (!developerToolsEnabled) {
					setOptions([]);
					setCurrent("");
					setLife("");
					setTeam("");
					setLoadError(void 0);
					return;
				}
				load().then((value) => {
					setOptions(value.options);
					setCurrent(value.current);
					setLife(value.life ?? "");
					setTeam(value.team ?? "");
					setLoadError(void 0);
				}).catch((error) => {
					const message = error instanceof Error ? error.message : String(error);
					setLoadError(message);
					console.error("digital-life: failed to load agent presets", error);
				});
			}, [developerToolsEnabled, load]);
			const chosen = options.find((option) => option.id === current);
			const chosenLife = records().find((record) => record.id === life);
			if (!developerToolsEnabled) return null;
			if (options.length === 0) return loadError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: AgentPresetSelector_module_css_default.error,
				role: "alert",
				children: loadError
			});
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
								children: option.description ?? t("presetNoDescription")
							})]
						})
					})),
					selectedId: current,
					onSelect: (id) => {
						setPresetOpen(false);
						const previous = current;
						setBusy(true);
						select(id).then(() => {
							setCurrent(id);
							if (id !== "digital-life-mode") {
								setLife("");
								setTeam("");
							}
						}).catch((error) => {
							setCurrent(previous);
							console.error("digital-life: failed to select agent preset", error);
						}).finally(() => setBusy(false));
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutlineMedium, { className: AgentPresetSelector_module_css_default.icon }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSelector_module_css_default.seatLabel,
								children: presetName
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineMedium, { className: AgentPresetSelector_module_css_default.chevron })
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
									categoryLabel(record, t)
								]
							})]
						})
					})),
					selectedId: life,
					onSelect: (id) => {
						setLifeOpen(false);
						selectLife(id).then(() => {
							setLife(id);
							setTeam("");
						}).catch((error) => {
							console.error("digital-life: failed to select digital life", error);
						});
					},
					align: "start",
					portal: true,
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: AgentPresetSelector_module_css_default.seat,
						"aria-haspopup": "menu",
						"aria-expanded": lifeOpen,
						title: life === "" ? team === "" ? t("chooseLifeRequired") : team : chosenLife?.name,
						onClick: () => {
							setLifeOpen((value) => !value);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutlineMedium, { className: AgentPresetSelector_module_css_default.icon }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: AgentPresetSelector_module_css_default.seatLabel,
								children: chosenLife?.name ?? (team === "" ? t("chooseLife") : team)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineMedium, { className: AgentPresetSelector_module_css_default.chevron })
						]
					})
				})]
			});
		}
		//#endregion
		//#region src/client/installAgentPresetSelector.ts
		/** Read the preset one session's summary currently runs, if any. */
		function presetOf(summary) {
			const value = summary?.projectionValues?.agentPreset;
			return typeof value === "string" ? value : void 0;
		}
		const BUILT_IN_PRESET_COPY = {
			standard: ["presetStandardName", "presetStandardDescription"],
			ptc: ["presetPtcName", "presetPtcDescription"],
			minimal: ["presetMinimalName", "presetMinimalDescription"],
			cordis: ["presetCordisName", "presetCordisDescription"]
		};
		function presetDisplayText(preset, translate) {
			const keys = preset.name === void 0 ? BUILT_IN_PRESET_COPY[preset.id] : void 0;
			if (keys !== void 0) return {
				name: translate(keys[0]),
				description: translate(keys[1])
			};
			return {
				name: preset.name ?? preset.id,
				...preset.description === void 0 ? {} : { description: preset.description }
			};
		}
		/** Install the composite Agent preset and digital-life selector into the Hero slot. */
		function installAgentPresetSelector(ctx, records, t, prepareSession) {
			const sessions = ctx.get("sessions");
			const remote = ctx.get("remote");
			const conversation = ctx.get("conversation");
			const presetT = ctx.locale.bind("settings.agentPreset");
			const developerTools = ctx.configForms.developerTools.enabled;
			const injectedBySession = /* @__PURE__ */ new Map();
			const selectedLifeBySession = /* @__PURE__ */ new Map();
			const teamBySession = /* @__PURE__ */ new Map();
			const stagedPreset = { id: void 0 };
			const rpcOf = () => {
				const connection = ctx.get("connection");
				if (connection === void 0) throw new Error("digital-life: connection service is unavailable");
				return connection.rpc;
			};
			const lifeFor = async (sessionId) => {
				const cached = selectedLifeBySession.get(sessionId);
				if (cached !== void 0) return cached || void 0;
				const result = await rpcOf().call("/digital-life", "binding", { sessionId });
				if (!result.ok) throw new Error(result.error.message);
				const value = result.value;
				if (typeof value?.team?.name === "string") teamBySession.set(sessionId, value.team.name);
				const recordId = value?.recordId;
				const selected = typeof recordId === "string" && records().some((record) => record.id === recordId) ? recordId : "";
				selectedLifeBySession.set(sessionId, selected);
				return selected || void 0;
			};
			const setLifeBlock = (sessionId, selected) => {
				conversation.blocks.set(sessionId, selected === void 0 && !teamBySession.has(sessionId) ? { reason: t("chooseLifeRequired") } : void 0);
			};
			const clearLifeBlock = (sessionId) => {
				conversation.blocks.set(sessionId, void 0);
			};
			const applyStagedPreset = async () => {
				const id = stagedPreset.id;
				if (id === void 0 || !developerTools.getSnapshot()) return;
				const summary = Object.values(sessions.list.getSnapshot().byId).find((item) => item.blank);
				if (summary === void 0) return;
				if (presetOf(summary) === id) return;
				const result = await remote.agentPresets.select(summary.id, id);
				if (!result.ok) throw new Error(result.error.message);
				stagedPreset.id = void 0;
			};
			ctx.effect(() => {
				return sessions.list.subscribe(() => {
					applyStagedPreset().catch((error) => {
						ctx.logger.error("digital-life: failed to apply staged preset", error);
					});
				});
			}, "digital-life: staged preset");
			ctx.effect(() => developerTools.subscribe(() => {
				if (!developerTools.getSnapshot()) stagedPreset.id = void 0;
			}), "digital-life: Developer tools gate");
			const injected = (rawSessionId) => {
				const cached = injectedBySession.get(rawSessionId);
				if (cached !== void 0) return cached;
				const sessionId = rawSessionId;
				let selectedPreset = "";
				const value = {
					records,
					t,
					developerTools,
					async selectLife(id) {
						const record = records().find((item) => item.id === id);
						if (record === void 0) throw new Error(`digital-life: unknown record "${id}"`);
						if (sessionId === void 0) {
							const createdSessionId = await prepareSession(record);
							selectedLifeBySession.set(createdSessionId, id);
							return;
						}
						const result = await rpcOf().call("/digital-life", "bind", {
							sessionId,
							recordId: id
						});
						if (!result.ok) throw new Error(result.error.message);
						selectedLifeBySession.set(sessionId, id);
						teamBySession.delete(sessionId);
						setLifeBlock(sessionId, id);
					},
					async load() {
						if (!developerTools.getSnapshot()) return {
							options: [],
							current: ""
						};
						const response = await remote.agentPresets.list();
						if (!response.ok) {
							if (response.error.code === "gateway/invocation-unavailable") return {
								options: [],
								current: ""
							};
							throw new Error(response.error.message);
						}
						const presets = response.value.presets.filter((item) => item.broken === void 0);
						const summary = sessionId === void 0 ? void 0 : sessions.list.getSnapshot().byId[sessionId];
						selectedPreset = stagedPreset.id || selectedPreset || presetOf(summary) || presets.find((item) => item.isDefault)?.id || presets[0]?.id || "";
						const life = sessionId === void 0 || selectedPreset !== "digital-life-mode" ? void 0 : await lifeFor(sessionId);
						if (sessionId !== void 0) {
							if (selectedPreset === "digital-life-mode") setLifeBlock(sessionId, life);
							else clearLifeBlock(sessionId);
						}
						return {
							options: presets.map((item) => {
								const display = presetDisplayText(item, presetT);
								return {
									id: item.id,
									name: display.name,
									...display.description === void 0 ? {} : { description: display.description }
								};
							}),
							current: selectedPreset,
							...life === void 0 ? {} : { life },
							...life === void 0 && sessionId !== void 0 && teamBySession.has(sessionId) ? { team: teamBySession.get(sessionId) } : {}
						};
					},
					async select(id) {
						if (!developerTools.getSnapshot()) return;
						if (sessionId === void 0) {
							selectedPreset = id;
							stagedPreset.id = id;
							applyStagedPreset().catch((error) => {
								ctx.logger.error("digital-life: failed to apply staged preset", error);
							});
							return;
						}
						const summary = sessions.list.getSnapshot().byId[sessionId];
						if (summary === void 0 || !summary.blank || presetOf(summary) === id) return;
						const result = await remote.agentPresets.select(sessionId, id);
						if (!result.ok) throw new Error(result.error.message);
						selectedPreset = id;
						if (id === "digital-life-mode") setLifeBlock(sessionId, await lifeFor(sessionId));
						else {
							const unbound = await rpcOf().call("/digital-life", "unbind", { sessionId });
							if (!unbound.ok) throw new Error(unbound.error.message);
							selectedLifeBySession.delete(sessionId);
							teamBySession.delete(sessionId);
							clearLifeBlock(sessionId);
						}
					}
				};
				injectedBySession.set(rawSessionId, value);
				return value;
			};
			ctx.slots.inject("conversation.hero.agentPreset", () => ctx.slots.register({
				name: "conversation.hero.agentPreset",
				priority: -10,
				locale: NS,
				inject: injected
			}, AgentPresetSelector));
		}
		//#endregion
		//#region src/client/ExpertWorkbench.tsx
		/** Ask the main agent to orchestrate the team with start_team_run arguments. */
		function reviewSubmission(request, instruction) {
			const args = request.teamId === void 0 ? {
				brief: request.question,
				analystIds: request.expertIds,
				reviewerId: request.reviewerId
			} : {
				brief: request.question,
				teamId: request.teamId
			};
			return `${instruction}\n\n${JSON.stringify(args, null, 2)}`;
		}
		//#endregion
		//#region src/client/ExpertAIPanel.tsx
		/** Sidebar glyph for the empty Expert AI template panel. */
		function ExpertAIPanelIcon({ size }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconThinkOutlineRegular, { size });
		}
		/** Empty first-pass panel; the Expert AI surface will be filled in later. */
		function ExpertAIPanel() {
			return null;
		}
		//#endregion
		//#region src/client/index.ts
		/** The Host plugin entry id whose settings this Client half edits. */
		const DIGITAL_LIFE_ENTRY_ID = DIGITAL_LIFE_NAMESPACE;
		const EXPERT_AI_PANEL_ID = "expert-ai";
		const inject = [
			"slots",
			"inputTriggers",
			"connection",
			"remote",
			"remote.agentPresets",
			"conversation",
			"configForms",
			"locale",
			"sessions",
			"uiWorkspace"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "digital-life: dictionaries");
			const t = ctx.locale.bind(NS);
			const form = ctx.configForms.get(DIGITAL_LIFE_ENTRY_ID);
			const callExpert = async (endpoint, payload) => {
				const connection = ctx.get("connection");
				if (connection === void 0) throw new Error("digital-life: connection service is unavailable");
				const result = await connection.rpc.call("/digital-life", endpoint, payload);
				if (!result.ok) throw new Error(result.error.message);
				return result.value;
			};
			const expertApi = {
				async catalog(ref) {
					return callExpert("expert/catalog", { ref });
				},
				async importExpert(slug, ref) {
					const imported = (record) => record.expertPackage?.slug === slug && record.expertPackage.ref === ref;
					const snapshot = form.getSnapshot();
					if (!snapshot.writable || snapshot.value === void 0) throw new Error(t("unavailable"));
					const existing = snapshot.value.records?.find(imported);
					if (existing !== void 0) return existing.id;
					const { record } = await callExpert("expert/import", {
						slug,
						ref
					});
					const latest = form.getSnapshot();
					if (!latest.writable || latest.value === void 0) throw new Error(t("unavailable"));
					if (latest.value.stateDir !== snapshot.value.stateDir) throw new Error(t("expertDirectoryChanged"));
					const records = latest.value.records ?? [];
					const samePackage = records.find(imported);
					if (samePackage !== void 0) return samePackage.id;
					const next = records.some((item) => item.id === record.id) ? {
						...record,
						id: `${record.id}-${ref.toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`
					} : record;
					if (records.some((item) => item.id === next.id)) throw new Error(t("expertIdConflict", { id: next.id }));
					if (!await form.set("records", [...records, next])) throw new Error(t("writeFailed"));
					return next.id;
				},
				async startReview(request) {
					const available = records();
					if (![...request.expertIds, request.reviewerId].every((id) => available.some((item) => item.id === id))) throw new Error(t("chooseExpert"));
					const { sessionId, reference } = await prepareSession(request.teamId === void 0 ? { lineup: {
						analystIds: request.expertIds,
						reviewerId: request.reviewerId
					} } : { teamId: request.teamId });
					try {
						ctx.uiWorkspace.openSession(sessionId);
						const result = await reference.binding.session.prompt([{
							type: "text",
							text: reviewSubmission(request, t("reviewRequestInstruction"))
						}], "queue");
						if (!result.ok) throw new Error(result.error.message);
					} finally {
						reference.release();
					}
				},
				listReviews: () => callExpert("review/list", {}),
				readReview: (id) => callExpert("review/read", { id }),
				async cancelReview(id) {
					await callExpert("review/cancel", { id });
				},
				openReviewSession(sessionId) {
					ctx.uiWorkspace.openSession(sessionId);
				}
			};
			const injected = () => ({
				hooks: { settings: form },
				form,
				t,
				expertApi,
				async loadIdentity(id) {
					const connection = ctx.get("connection");
					if (connection === void 0) throw new Error("digital-life: connection service is unavailable");
					const result = await connection.rpc.call("/digital-life", "identity", { recordId: id });
					if (!result.ok) throw new Error(result.error.message);
					return result.value.identity;
				}
			});
			const records = () => form.getSnapshot().value?.records?.filter((record) => record.enabled) ?? [];
			const teams = () => form.getSnapshot().value?.teams ?? [];
			const sessions = ctx.get("sessions");
			const remote = ctx.get("remote");
			const selectDigitalLifeMode = async (sessionId) => {
				const roster = await remote.agentPresets.list();
				if (!roster.ok && roster.error.code !== "gateway/invocation-unavailable") throw new Error(roster.error.message);
				if (roster.ok && roster.value.presets.some((preset) => preset.id === "digital-life-mode" && preset.broken === void 0)) {
					const selected = await remote.agentPresets.select(sessionId, "digital-life-mode");
					if (!selected.ok) throw new Error(selected.error.message);
				}
			};
			const prepareSession = async (target) => {
				const connection = ctx.get("connection");
				if (connection === void 0) throw new Error("digital-life: connection service is unavailable");
				const rpc = connection.rpc;
				const project = await rpc.call("/digital-life", "project", {});
				if (!project.ok) throw new Error(project.error.message);
				const cwd = project.value.cwd;
				if (typeof cwd !== "string" || cwd === "") throw new Error("digital-life: project directory is unavailable");
				const sessionId = await sessions.create({ cwd });
				const reference = sessions.retain(sessionId, { source: "digitalLife" });
				try {
					await reference.ready;
					if (target !== void 0) {
						await selectDigitalLifeMode(sessionId);
						const init = await rpc.call("/digital-life", "bind", {
							sessionId,
							...target
						});
						if (!init.ok) throw new Error(init.error.message);
					}
					return {
						sessionId,
						reference
					};
				} catch (error) {
					reference.release();
					throw error;
				}
			};
			const openDigitalLifeSession = async (record) => {
				const { sessionId, reference } = await prepareSession({ recordId: record.id });
				try {
					ctx.uiWorkspace.openSession(sessionId);
					return sessionId;
				} finally {
					reference.release();
				}
			};
			const createSession = async (record) => {
				const { sessionId, reference } = await prepareSession(record === void 0 ? void 0 : { recordId: record.id });
				try {
					const connection = ctx.get("connection");
					if (connection === void 0) throw new Error("digital-life: connection service is unavailable");
					const rpc = connection.rpc;
					const text = record === void 0 ? t("independentGreeting") : t("sessionGreeting", {
						name: record.name,
						description: record.description
					});
					const greeting = await rpc.call("/digital-life", "greeting", {
						sessionId,
						text
					});
					if (!greeting.ok) throw new Error(greeting.error.message);
					ctx.uiWorkspace.openSession(sessionId);
					return sessionId;
				} finally {
					reference.release();
				}
			};
			const chatInjected = () => ({
				records,
				createSession,
				t
			});
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "digital-life-chat-panel",
				order: -10,
				locale: NS,
				inject: chatInjected
			}, ChatPanel));
			installAgentPresetSelector(ctx, records, t, openDigitalLifeSession);
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: EXPERT_AI_PANEL_ID
			}, ExpertAIPanel));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: EXPERT_AI_PANEL_ID,
				order: 20,
				label: () => t("expertAiPanel"),
				locale: NS
			}, ExpertAIPanelIcon));
			const navIcon = { icon: _deepseek_ai_dsh_client_ui_primitives.IconUsersOutlineMedium };
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: DIGITAL_LIFE_NAMESPACE,
				order: 25,
				label: () => t("nav"),
				...navIcon,
				locale: NS,
				inject: injected
			}, DigitalLifeSettingSection));
			const source = {
				trigger: "@",
				name: DIGITAL_LIFE_NAMESPACE,
				order: 5,
				candidates(_session, { query }) {
					return Promise.resolve(mentionCandidates(records(), teams(), query).map(({ name, description, kind }) => ({
						name,
						description,
						icon: kind === "team" ? _deepseek_ai_dsh_client_ui_primitives.IconUsersOutlineMedium : _deepseek_ai_dsh_client_ui_primitives.IconUserOutlineRegular
					})));
				},
				warm() {
					Promise.resolve();
				},
				lexicon() {
					return [...records().map((item) => item.id), ...teams().map((team) => team.id)];
				},
				subscribeLexicon(_session, listener) {
					return form.subscribe(listener);
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