package controllers

import (
	"testing"
	"time"

	"github.com/aoagents/agent-orchestrator/backend/internal/domain"
)

func TestSessionViewExposesLatestAssistantProgress(t *testing.T) {
	at := time.Unix(1_700_000_000, 0).UTC()
	view := sessionView(domain.Session{
		SessionRecord: domain.SessionRecord{
			ID: "mer-23",
			Metadata: domain.SessionMetadata{
				LatestAssistantUpdate:   "Running focused queue tests",
				LatestAssistantUpdateAt: at,
			},
		},
	})

	if view.LatestAssistantUpdate != "Running focused queue tests" {
		t.Fatalf("latest assistant update = %q", view.LatestAssistantUpdate)
	}
	if view.LastAssistantUpdateAt == nil || !view.LastAssistantUpdateAt.Equal(at) {
		t.Fatalf("last assistant update at = %v, want %s", view.LastAssistantUpdateAt, at)
	}
}
