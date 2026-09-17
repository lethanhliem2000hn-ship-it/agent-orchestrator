import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_UI_SETTINGS, coerceUiSettings, type UiSettings } from "../shared/ui-locale";
import { clearNghimmoApiKey, readNghimmoApiKey, writeNghimmoApiKey } from "./nghimmo-settings";

export { DEFAULT_UI_SETTINGS, coerceUiSettings } from "../shared/ui-locale";
export type { AppLocale, UiSettings } from "../shared/ui-locale";

/** File holding lightweight UI prefs (locale) under the ~/.ao state dir. */
export const UI_SETTINGS_FILE_NAME = "ui-settings.json";

let settingsOperationQueue: Promise<void> = Promise.resolve();

async function readUiPreferences(stateDir: string): Promise<UiSettings> {
	let raw: string;
	try {
		raw = await readFile(path.join(stateDir, UI_SETTINGS_FILE_NAME), "utf8");
	} catch {
		return { ...DEFAULT_UI_SETTINGS };
	}
	try {
		return coerceUiSettings(JSON.parse(raw));
	} catch {
		return { ...DEFAULT_UI_SETTINGS };
	}
}

async function readUiSettingsUnlocked(stateDir: string): Promise<UiSettings> {
	const settings = await readUiPreferences(stateDir);
	const nghimmoApiKey = await readNghimmoApiKey(stateDir);
	if (nghimmoApiKey) process.env.OPENAI_API_KEY = nghimmoApiKey;
	return { ...settings, nghimmoApiKeyConfigured: Boolean(nghimmoApiKey) };
}

async function writeUiSettingsUnlocked(stateDir: string, patch: Partial<UiSettings>): Promise<UiSettings> {
	// A caller only sends the field it changed (e.g. just `locale` or just
	// `soundNotificationsEnabled`); merge onto persisted non-secret settings so
	// one setting's write never resets another. Credential fields are handled
	// separately and are never written into ui-settings.json or returned.
	const current = await readUiPreferences(stateDir);
	const next = coerceUiSettings({ ...current, ...patch });
	await mkdir(stateDir, { recursive: true, mode: 0o750 });

	if (patch.clearNghimmoApiKey) {
		await clearNghimmoApiKey(stateDir);
		delete process.env.OPENAI_API_KEY;
	} else if (typeof patch.nghimmoApiKey === "string" && patch.nghimmoApiKey.trim()) {
		const key = patch.nghimmoApiKey.trim();
		await writeNghimmoApiKey(stateDir, key);
		process.env.OPENAI_API_KEY = key;
	}

	const file = path.join(stateDir, UI_SETTINGS_FILE_NAME);
	const data = `${JSON.stringify(next, null, 2)}\n`;
	const tmp = path.join(stateDir, `.ui-settings-${process.pid}-${Date.now()}.json`);
	await writeFile(tmp, data, { mode: 0o600 });
	await rename(tmp, file);
	const configured = Boolean(await readNghimmoApiKey(stateDir));
	return { ...next, nghimmoApiKeyConfigured: configured };
}

function runSettingsOperation<T>(operation: () => Promise<T>): Promise<T> {
	const queued = settingsOperationQueue.then(operation, operation);
	settingsOperationQueue = queued.then(
		() => undefined,
		() => undefined,
	);
	return queued;
}

/** Read UI settings, tolerating a missing or corrupt file (returns defaults). */
export async function readUiSettings(stateDir: string): Promise<UiSettings> {
	return readUiSettingsUnlocked(stateDir);
}

/** Atomically and serially merge-write UI settings (temp file + rename). */
export async function writeUiSettings(stateDir: string, patch: Partial<UiSettings>): Promise<UiSettings> {
	return runSettingsOperation(() => writeUiSettingsUnlocked(stateDir, patch));
}
