import { mkdtemp, readFile, rm, writeFile, symlink, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { importMimeograph, loadExpertCatalog, packageAgentBinding, readExpertReference, recordForPackage } from "../src/host/expert-packages.js";
import { digitalLifeHome, identityFor, reconcileIdentities } from "../src/host/identity.js";
import { validateSettings } from "../src/host/index.js";
import { packageBinding, packageFetcher } from "./expert-fixture.js";

const roots: string[] = [];
async function root() { const value = await mkdtemp(join(tmpdir(), "expert-package-test-")); roots.push(value); return value; }
afterEach(async () => { await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("versioned expert packages", () => {
  it("imports only declared text and the license, with hashes and portable binding", async () => {
    const stateDir = await root();
    const fetcher = packageFetcher();
    const manifest = await importMimeograph(packageBinding, stateDir, fetcher);
    expect(manifest).toMatchObject({ ...packageBinding, sourceType: "public-method", reviewStatus: "unreviewed" });
    expect(manifest.files).toHaveLength(6);
    expect(manifest.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256))).toBe(true);
    for (const [url] of fetcher.mock.calls) {
      expect(String(url)).toContain(`/${packageBinding.revision}/`);
      expect(String(url)).not.toMatch(/avatar|_workspace/);
    }
    const record = recordForPackage(manifest);
    expect(() => validateSettings({ records: [record] })).not.toThrow();
    expect(record.agent).toBe(packageAgentBinding(packageBinding));
    expect(await identityFor(record, stateDir)).toContain("Separate evidence");
    const reference = await readExpertReference(record, "references/frameworks.md", stateDir, 10);
    expect(reference.text).toHaveLength(10);
    expect(reference.truncated).toBe(true);
    expect(reference.id).toContain(packageBinding.revision);
    expect(reference.sourceUrl).toContain("/blob/");
    await reconcileIdentities([record], [], stateDir);
    expect(await identityFor(record, stateDir)).toContain("Separate evidence");
  });

  it("reuses immutable packages offline and preserves the original import date", async () => {
    const stateDir = await root();
    const first = await importMimeograph(packageBinding, stateDir, packageFetcher());
    const offline = vi.fn<typeof fetch>(() => Promise.reject(new Error("offline")));
    expect(await importMimeograph(packageBinding, stateDir, offline)).toEqual(first);
    expect(offline).not.toHaveBeenCalled();
  });

  it("rejects branch names and traversal before downloading", async () => {
    const fetcher = packageFetcher();
    await expect(importMimeograph({ ...packageBinding, revision: "main" }, await root(), fetcher)).rejects.toThrow(/commit SHA/);
    await expect(importMimeograph({ ...packageBinding, slug: "../outside" }, await root(), fetcher)).rejects.toThrow(/invalid expert/);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(loadExpertCatalog(packageBinding.revision, packageFetcher({ references: ["references/../../private.md"] }))).rejects.toThrow(/reference list/);
  });

  it("does not leave a package behind after a failed download", async () => {
    const stateDir = await root();
    await expect(importMimeograph(packageBinding, stateDir, packageFetcher({ fail: "mimeographs/test-expert/SKILL.md" }))).rejects.toThrow(/download failed/);
    await expect(readFile(join(digitalLifeHome(process.env, stateDir), packageAgentBinding(packageBinding)))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects modified identity and undeclared or escaping reference files", async () => {
    const stateDir = await root();
    const record = recordForPackage(await importMimeograph(packageBinding, stateDir, packageFetcher()));
    await expect(readExpertReference(record, "../settings.yaml", stateDir)).rejects.toThrow(/references/);
    await expect(readExpertReference(record, "references/unknown.md", stateDir)).rejects.toThrow(/manifest/);
    const identity = join(digitalLifeHome(process.env, stateDir), record.agent!);
    await writeFile(identity, "tampered identity");
    await expect(identityFor(record, stateDir)).rejects.toThrow(/size changed|integrity/);
    await expect(importMimeograph(packageBinding, stateDir, packageFetcher())).rejects.toThrow(/size changed|integrity/);
    const reference = join(dirname(identity), "references/frameworks.md");
    await rm(reference);
    const outside = join(stateDir, "outside.md");
    await writeFile(outside, "private");
    await symlink(outside, reference);
    await expect(readExpertReference(record, "references/frameworks.md", stateDir)).rejects.toThrow(/escapes/);
  });

  it("handles concurrent imports atomically", async () => {
    const stateDir = await root();
    const manifests = await Promise.all([importMimeograph(packageBinding, stateDir, packageFetcher()), importMimeograph(packageBinding, stateDir, packageFetcher())]);
    expect(manifests[0]).toEqual(manifests[1]);
    const parent = dirname(dirname(join(digitalLifeHome(process.env, stateDir), packageAgentBinding(packageBinding))));
    expect(await readdir(parent)).toEqual([packageBinding.slug]);
  });

  it("does not relabel a different identity as the imported package", async () => {
    const manifest = await importMimeograph(packageBinding, await root(), packageFetcher());
    expect(() => validateSettings({ records: [{ ...recordForPackage(manifest), agent: "/tmp/other.md" }] })).toThrow(/immutable package/);
  });
});
