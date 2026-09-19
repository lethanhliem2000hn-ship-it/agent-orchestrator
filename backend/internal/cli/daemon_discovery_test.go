package cli

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/aoagents/agent-orchestrator/backend/internal/config"
	"github.com/aoagents/agent-orchestrator/backend/internal/runfile"
)

func TestDiscoverDaemonTargetFallsBackToDevRunFile(t *testing.T) {
	t.Setenv("AO_RUN_FILE", "")
	root := t.TempDir()
	cfg := config.Config{
		RunFilePath: filepath.Join(root, "running.json"),
		DataDir:     filepath.Join(root, "data"),
	}
	devRun := filepath.Join(root, "dev", "running.json")
	if err := runfile.Write(devRun, runfile.Info{PID: 4242, Port: 3002, StartedAt: time.Now().UTC()}); err != nil {
		t.Fatal(err)
	}

	target, err := discoverDaemonTarget(cfg, func(pid int) bool { return pid == 4242 })
	if err != nil {
		t.Fatal(err)
	}
	if target.Info == nil || target.Info.PID != 4242 {
		t.Fatalf("discovered info = %+v, want dev daemon pid 4242", target.Info)
	}
	if target.RunFile != devRun {
		t.Fatalf("run file = %q, want %q", target.RunFile, devRun)
	}
	wantData := filepath.Join(root, "dev", "data")
	if target.DataDir != wantData {
		t.Fatalf("data dir = %q, want %q", target.DataDir, wantData)
	}
}

func TestDiscoverDaemonTargetPrefersPrimary(t *testing.T) {
	t.Setenv("AO_RUN_FILE", "")
	root := t.TempDir()
	cfg := config.Config{RunFilePath: filepath.Join(root, "running.json"), DataDir: filepath.Join(root, "data")}
	if err := runfile.Write(cfg.RunFilePath, runfile.Info{PID: 100, Port: 3001, StartedAt: time.Now().UTC()}); err != nil {
		t.Fatal(err)
	}
	if err := runfile.Write(filepath.Join(root, "dev", "running.json"), runfile.Info{PID: 200, Port: 3002, StartedAt: time.Now().UTC()}); err != nil {
		t.Fatal(err)
	}

	target, err := discoverDaemonTarget(cfg, func(int) bool { return true })
	if err != nil {
		t.Fatal(err)
	}
	if target.Info == nil || target.Info.PID != 100 {
		t.Fatalf("discovered info = %+v, want primary daemon pid 100", target.Info)
	}
	if target.RunFile != cfg.RunFilePath {
		t.Fatalf("run file = %q, want primary %q", target.RunFile, cfg.RunFilePath)
	}
}

func TestDiscoverDaemonTargetHonorsExplicitRunFile(t *testing.T) {
	root := t.TempDir()
	explicit := filepath.Join(root, "custom", "running.json")
	t.Setenv("AO_RUN_FILE", explicit)
	cfg := config.Config{RunFilePath: explicit, DataDir: filepath.Join(root, "custom", "data")}
	if err := runfile.Write(filepath.Join(root, "custom", "dev", "running.json"), runfile.Info{PID: 200, Port: 3002, StartedAt: time.Now().UTC()}); err != nil {
		t.Fatal(err)
	}

	target, err := discoverDaemonTarget(cfg, func(int) bool { return true })
	if err != nil {
		t.Fatal(err)
	}
	if target.Info != nil {
		t.Fatalf("explicit missing run file unexpectedly fell back: %+v", target.Info)
	}
	if target.RunFile != explicit {
		t.Fatalf("run file = %q, want explicit %q", target.RunFile, explicit)
	}
}
