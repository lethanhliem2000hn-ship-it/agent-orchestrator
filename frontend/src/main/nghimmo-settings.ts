import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const NGHIMMO_API_KEY_FILE_NAME = "nghimmo-api-key";

function keyFile(stateDir: string): string {
	return path.join(stateDir, NGHIMMO_API_KEY_FILE_NAME);
}

export async function readNghimmoApiKey(stateDir: string): Promise<string | null> {
	try {
		const value = (await readFile(keyFile(stateDir), "utf8")).trim();
		return value || null;
	} catch {
		return null;
	}
}

export async function writeNghimmoApiKey(stateDir: string, apiKey: string): Promise<void> {
	const value = apiKey.trim();
	if (!value) throw new Error("Nghimmo API key is required.");
	await mkdir(stateDir, { recursive: true, mode: 0o750 });
	const target = keyFile(stateDir);
	const temporary = path.join(stateDir, `.nghimmo-api-key-${process.pid}-${Date.now()}.tmp`);
	await writeFile(temporary, `${value}\n`, { mode: 0o600 });
	await rename(temporary, target);
}

export async function clearNghimmoApiKey(stateDir: string): Promise<void> {
	await rm(keyFile(stateDir), { force: true });
}
