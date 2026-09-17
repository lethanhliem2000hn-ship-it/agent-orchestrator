// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	clearNghimmoApiKey,
	NGHIMMO_API_KEY_FILE_NAME,
	readNghimmoApiKey,
	writeNghimmoApiKey,
} from "./nghimmo-settings";

describe("nghimmo-settings", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(path.join(os.tmpdir(), "ao-nghimmo-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	it("returns null when no key has been saved", async () => {
		expect(await readNghimmoApiKey(dir)).toBeNull();
	});

	it("round-trips a trimmed key without exposing extra whitespace", async () => {
		await writeNghimmoApiKey(dir, "  test-key-123  ");
		expect(await readNghimmoApiKey(dir)).toBe("test-key-123");
		expect(await readFile(path.join(dir, NGHIMMO_API_KEY_FILE_NAME), "utf8")).toBe("test-key-123\n");
	});

	it("writes the credential with owner-only permissions on POSIX", async () => {
		await writeNghimmoApiKey(dir, "test-key");
		if (process.platform === "win32") return;
		const info = await stat(path.join(dir, NGHIMMO_API_KEY_FILE_NAME));
		expect(info.mode & 0o777).toBe(0o600);
	});

	it("clears a saved key", async () => {
		await writeNghimmoApiKey(dir, "test-key");
		await clearNghimmoApiKey(dir);
		expect(await readNghimmoApiKey(dir)).toBeNull();
	});
});
