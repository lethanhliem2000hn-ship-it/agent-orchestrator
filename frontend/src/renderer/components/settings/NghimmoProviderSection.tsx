import { KeyRound, LoaderCircle, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { aoBridge } from "../../lib/bridge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SettingsRow } from "./SettingsRow";
import { SettingsSection } from "./SettingsSection";

export function NghimmoProviderSection({ titleHidden }: { titleHidden?: boolean }) {
	const [apiKey, setApiKey] = useState("");
	const [configured, setConfigured] = useState(false);
	const [busy, setBusy] = useState<"save" | "clear" | null>(null);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;
		void aoBridge.uiSettings.get().then((settings) => {
			if (!cancelled) setConfigured(settings.nghimmoApiKeyConfigured === true);
		}).catch(() => undefined);
		return () => { cancelled = true; };
	}, []);

	const save = async () => {
		const key = apiKey.trim();
		if (!key) {
			setError("Paste your Nghimmo API key first.");
			return;
		}
		setBusy("save");
		setMessage("");
		setError("");
		try {
			const settings = await aoBridge.uiSettings.set({ nghimmoApiKey: key });
			setConfigured(settings.nghimmoApiKeyConfigured === true);
			setApiKey("");
			const daemon = await aoBridge.daemon.restart();
			if (daemon.state === "failed") throw new Error(daemon.message || "Daemon restart failed.");
			setMessage("Saved. AO restarted the daemon with the new key. Create a new Codex task to use it.");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not save the Nghimmo API key.");
		} finally {
			setBusy(null);
		}
	};

	const clear = async () => {
		setBusy("clear");
		setMessage("");
		setError("");
		try {
			const settings = await aoBridge.uiSettings.set({ clearNghimmoApiKey: true });
			setConfigured(settings.nghimmoApiKeyConfigured === true);
			setApiKey("");
			const daemon = await aoBridge.daemon.restart();
			if (daemon.state === "failed") throw new Error(daemon.message || "Daemon restart failed.");
			setMessage("Saved Nghimmo key removed. AO restarted the daemon.");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Could not remove the Nghimmo API key.");
		} finally {
			setBusy(null);
		}
	};

	return (
		<SettingsSection title="Nghimmo API" sectionId="nghimmo-api" titleHidden={titleHidden}>
			<div className="rounded-md bg-[var(--color-bg-settings-row)]">
				<SettingsRow icon={KeyRound} label="Custom Codex provider">
					<span className={`text-xs ${configured ? "text-success" : "text-muted-foreground"}`}>
						{configured ? "Key saved locally" : "No saved key"}
					</span>
				</SettingsRow>
				<div className="border-t border-border px-3 py-3">
					<p className="mb-3 text-xs leading-relaxed text-muted-foreground">
						Use a Nghimmo key for the Codex custom provider. The key is kept in AO's local state with owner-only file permissions and is never shown again after saving.
					</p>
					<div className="flex items-center gap-2">
						<Input
							type="password"
							autoComplete="off"
							spellCheck={false}
							value={apiKey}
							onChange={(event) => setApiKey(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter" && busy === null) void save();
							}}
							placeholder={configured ? "Paste a new key to replace the saved key" : "Paste Nghimmo API key"}
							aria-label="Nghimmo API key"
						/>
						<Button type="button" onClick={() => void save()} disabled={busy !== null || !apiKey.trim()}>
							{busy === "save" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
							Save & restart
						</Button>
					</div>
					<div className="mt-2 flex items-center justify-between gap-3">
						<div className="min-h-5 text-xs">
							{error ? <span className="text-error" role="alert">{error}</span> : null}
							{!error && message ? <span className="text-muted-foreground" role="status">{message}</span> : null}
						</div>
						{configured ? (
							<Button type="button" size="sm" variant="ghost" onClick={() => void clear()} disabled={busy !== null}>
								{busy === "clear" ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
								Remove saved key
							</Button>
						) : null}
					</div>
					<p className="mt-2 flex items-center gap-1.5 text-micro text-muted-foreground">
						<RotateCcw className="size-3" aria-hidden="true" /> Saving restarts the AO daemon so new Codex sessions receive the key immediately.
					</p>
				</div>
			</div>
		</SettingsSection>
	);
}
