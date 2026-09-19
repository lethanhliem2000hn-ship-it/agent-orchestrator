package cli

import (
	"bytes"
	"strings"
	"testing"

	"github.com/spf13/cobra"
)

func TestWriteSessionDetailsShowsLatestWorkerProgress(t *testing.T) {
	var out bytes.Buffer
	cmd := &cobra.Command{}
	cmd.SetOut(&out)

	err := writeSessionDetails(cmd, sessionDTO{
		ID:                    "autofb-23",
		Status:                "working",
		LatestAssistantUpdate: "Running queue tests",
	})
	if err != nil {
		t.Fatal(err)
	}
	got := out.String()
	if !strings.Contains(got, "latest update: Running queue tests") {
		t.Fatalf("session details missing latest worker progress:\n%s", got)
	}
}
