import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { Session } from "@deepseek-ai/dsh-session";
import { appendOpeningAssistantMessage } from "../src/host/index.js";
import { loadBinding, saveBinding } from "../src/host/session-binding.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("digital-life session binding", () => {
  it("appends the opening assistant message without an agent request", () => {
    const session = Session.create("session-opening" as never);

    appendOpeningAssistantMessage(session, "欢迎开始");
    appendOpeningAssistantMessage(session, "欢迎开始");

    expect(session.deriveMessages()).toHaveLength(1);
    expect(session.deriveMessages()[0]).toMatchObject({
      role: "assistant",
      content: [{ type: "text", text: "欢迎开始" }],
      source: { provider: "digital-life", model: "opening" },
    });
    expect(session.snapshotEvents().map((event) => event.type)).toEqual([
      "turn/start",
      "step/start",
      "assistant/message",
      "step/end",
      "turn/end",
    ]);
  });

  it("restores the selected identity across host restarts", async () => {
    const root = await mkdtemp(join(tmpdir(), "digital-life-binding-"));
    roots.push(root);
    const sessionId = "session-1234";
    const binding = { recordId: "research-guide", prompt: "Be a researcher" };

    expect(await loadBinding(sessionId, root)).toBeUndefined();
    await saveBinding(sessionId, binding, root);
    expect(await loadBinding(sessionId, root)).toEqual(binding);
    expect(JSON.parse(await readFile(join(root, "digital-life", "sessions", `${sessionId}.json`), "utf8"))).toEqual(binding);
  });

  it("rejects paths outside the managed session directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "digital-life-binding-"));
    roots.push(root);
    await expect(saveBinding("../other", { recordId: "life", prompt: "text" }, root)).rejects.toThrow(/invalid session id/);
  });
});
