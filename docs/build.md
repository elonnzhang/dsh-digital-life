# 构建方式

## 产物

这个包同时提供 Host 和 Client 两个运行面：

| 产物 | 输入 | 消费方 |
| --- | --- | --- |
| `lib/index.js` | `src/index.ts` | Node Host / Cordis |
| `lib/index.d.ts` | Host 类型 | TypeScript 消费方 |
| `lib/invariant.js` | `src/invariant.ts` | Harness invariant 检查 |
| `lib/client.js` | `src/client/index.ts` | Web Profile 的 Client module loader |
| `lib/types/client/index.d.ts` | Client 类型声明 | `./client` 的 TypeScript 消费方 |

Client 运行时不是普通浏览器 bundle。它必须在脚本加载时调用
`window.__ModuleLoader__.load({ id, factory })`，并在 factory 执行时注入 CSS。这个约束由
`tsdown.client.ts` 保持；不要把 Client 改成普通 ESM、IIFE 或旁路的 `.css` 文件。

## 本地命令

```sh
pnpm install
pnpm run typecheck
pnpm run build
pnpm run smoke
pnpm run check
pnpm run dev                 # tsdown --watch
```

`build` 在 tsdown 后运行 `build:types`，补齐双面包的 per-file 声明。`check` 依次执行类型检查、
构建和产物 smoke。smoke 只确认模块契约与 Client 注册，不等价于
真实 Harness Web E2E；加载验收见 [load-into-dsh.md](load-into-dsh.md)。

## 依赖边界

`@deepseek-ai/cordis`、`@deepseek-ai/dsh-*` 和 React 都是 `peerDependencies`，运行时由 dsh
Profile 提供。Host 构建的 `deps.neverBundle` 与 Client 的 module-table external 共同保证不会
复制第二份 Cordis 或共享 Client runtime。真正属于插件自身的运行时依赖才放进 `dependencies`；
当前只有 `@deepseek-ai/schemastery`。

仓库的 `.npmrc` 关闭了 `auto-install-peers`，以免开发安装隐式拉出一套不完整的 dsh peer 图。
需要参与类型检查的 peer 已显式列在 `devDependencies`。
安装时若 pnpm 报告 DSH rc 包的传递 peer 未列出，这是宿主 Profile 的依赖边界，不是插件
运行时会自行补装的依赖。

## 发布文件

`files` 只发布 `lib/`、`cordis.patch.yml` 和 README。源码、测试和本地 overlay 不进入 tarball。
发布前检查：

```sh
pnpm run check
pnpm pack --dry-run
```

应至少看到 `package/lib/index.js`、`package/lib/index.d.ts`、`package/lib/client.js` 和
`package/cordis.patch.yml`。
