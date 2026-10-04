import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { digitalLifeHome } from "./identity.js";

export interface DigitalLifeBinding {
  recordId: string;
  prompt: string;
}

function bindingPath(sessionId: string, stateDir?: string): string {
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(sessionId))
    throw new Error(`digital-life: invalid session id "${sessionId}"`);
  return join(digitalLifeHome(process.env, stateDir), "sessions", `${sessionId}.json`);
}

export async function loadBinding(sessionId: string, stateDir?: string): Promise<DigitalLifeBinding | undefined> {
  let content: string;
  try {
    content = await readFile(bindingPath(sessionId, stateDir), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const value: unknown = JSON.parse(content);
  if (typeof value !== "object" || value === null ||
      typeof (value as DigitalLifeBinding).recordId !== "string" ||
      typeof (value as DigitalLifeBinding).prompt !== "string")
    throw new Error(`digital-life: invalid binding for session "${sessionId}"`);
  return value as DigitalLifeBinding;
}

export async function saveBinding(sessionId: string, binding: DigitalLifeBinding, stateDir?: string): Promise<void> {
  const path = bindingPath(sessionId, stateDir);
  await mkdir(join(digitalLifeHome(process.env, stateDir), "sessions"), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(binding), { flag: "wx", mode: 0o600 });
  try {
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function deleteBinding(sessionId: string, stateDir?: string): Promise<void> {
  try {
    await unlink(bindingPath(sessionId, stateDir));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
