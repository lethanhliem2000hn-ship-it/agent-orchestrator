package cli

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/aoagents/agent-orchestrator/backend/internal/config"
	"github.com/aoagents/agent-orchestrator/backend/internal/runfile"
)

// daemonTarget is the CLI-side discovery result for a live AO daemon.
//
// Development builds intentionally isolate state under ~/.ao/dev while the
// release CLI defaults to ~/.ao. A shell that did not inherit the desktop/dev
// environment used to report "stopped" even though the dev daemon was healthy.
// The CLI now falls back to the isolated dev run-file only when AO_RUN_FILE was
// not explicitly configured.
type daemonTarget struct {
	RunFile string
	DataDir string
	Info    *runfile.Info
}

func discoverDaemonTarget(cfg config.Config, processAlive func(int) bool) (daemonTarget, error) {
	primary := daemonTarget{RunFile: cfg.RunFilePath, DataDir: cfg.DataDir}
	candidates := []daemonTarget{primary}
	explicitRunFile := false
	if raw, ok := os.LookupEnv("AO_RUN_FILE"); ok && raw != "" {
		explicitRunFile = true
	}

	if !explicitRunFile {
		stateDir := filepath.Dir(cfg.RunFilePath)
		dev := daemonTarget{
			RunFile: filepath.Join(stateDir, "dev", "running.json"),
			DataDir: filepath.Join(stateDir, "dev", "data"),
		}
		if filepath.Clean(dev.RunFile) != filepath.Clean(primary.RunFile) {
			candidates = append(candidates, dev)
		}
	}

	var firstErr error
	for _, candidate := range candidates {
		info, err := runfile.Read(candidate.RunFile)
		if err != nil {
			if firstErr == nil {
				firstErr = fmt.Errorf("read run-file %s: %w", candidate.RunFile, err)
			}
			continue
		}
		if info == nil || info.PID <= 0 {
			continue
		}
		if processAlive != nil && !processAlive(info.PID) {
			continue
		}
		candidate.Info = info
		return candidate, nil
	}
	if firstErr != nil {
		return primary, firstErr
	}
	return primary, nil
}
