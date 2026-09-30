// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// This helper runs inside the pinned Jaeger source tree so it can call the
// same adapter as Jaeger's storage layer. It never imports the UI parser.
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jaegertracing/jaeger-idl/model/v1"
	"github.com/jaegertracing/jaeger/internal/storage/v2/v1adapter"
	"go.opentelemetry.io/collector/pdata/ptrace"
)

type tag struct {
	Key   string
	Value any
	Type  string
}
type reference struct {
	RefType string
	TraceID string
	SpanID  string
}
type process struct {
	ServiceName string
	Tags        []tag
}
type logEntry struct {
	Timestamp int64
	Fields    []tag
}
type span struct {
	TraceID       string
	SpanID        string
	ProcessID     string
	OperationName string
	StartTime     int64
	Duration      int64
	Tags          []tag
	Logs          []logEntry
	References    []reference
	Warnings      []string
}
type trace struct {
	TraceID   string
	Processes map[string]process
	Spans     []span
}

func tags(input []tag) ([]model.KeyValue, error) {
	output := make([]model.KeyValue, 0, len(input))
	for _, t := range input {
		switch value := t.Value.(type) {
		case string:
			output = append(output, model.String(t.Key, value))
		case bool:
			output = append(output, model.Bool(t.Key, value))
		case float64:
			if t.Type == "float64" {
				output = append(output, model.Float64(t.Key, value))
			} else {
				output = append(output, model.Int64(t.Key, int64(value)))
			}
		default:
			return nil, fmt.Errorf("unsupported legacy tag %s", t.Key)
		}
	}
	return output, nil
}

func convert(input trace) ([]byte, error) {
	domain := &model.Trace{}
	for _, s := range input.Spans {
		traceID, err := model.TraceIDFromString(s.TraceID)
		if err != nil {
			return nil, err
		}
		spanID, err := model.SpanIDFromString(s.SpanID)
		if err != nil {
			return nil, err
		}
		spanTags, err := tags(s.Tags)
		if err != nil {
			return nil, err
		}
		p, exists := input.Processes[s.ProcessID]
		if !exists {
			return nil, fmt.Errorf("unknown process %s", s.ProcessID)
		}
		processTags, err := tags(p.Tags)
		if err != nil {
			return nil, err
		}
		target := &model.Span{
			TraceID: traceID, SpanID: spanID, OperationName: s.OperationName,
			StartTime: time.UnixMicro(s.StartTime), Duration: time.Duration(s.Duration) * time.Microsecond,
			Tags: spanTags, Process: &model.Process{ServiceName: p.ServiceName, Tags: processTags}, Warnings: s.Warnings,
		}
		for _, ref := range s.References {
			refTraceID, err := model.TraceIDFromString(ref.TraceID)
			if err != nil {
				return nil, err
			}
			refSpanID, err := model.SpanIDFromString(ref.SpanID)
			if err != nil {
				return nil, err
			}
			refType := model.ChildOf
			if ref.RefType == "FOLLOWS_FROM" {
				refType = model.FollowsFrom
			} else if ref.RefType != "CHILD_OF" {
				return nil, fmt.Errorf("unknown reference %s", ref.RefType)
			}
			target.References = append(target.References, model.SpanRef{TraceID: refTraceID, SpanID: refSpanID, RefType: refType})
		}
		for _, entry := range s.Logs {
			fields, err := tags(entry.Fields)
			if err != nil {
				return nil, err
			}
			target.Logs = append(target.Logs, model.Log{Timestamp: time.UnixMicro(entry.Timestamp), Fields: fields})
		}
		domain.Spans = append(domain.Spans, target)
	}
	return (&ptrace.JSONMarshaler{}).MarshalTraces(v1adapter.V1TraceToOtelTrace(domain))
}

func main() {
	http.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) })
	http.HandleFunc("POST /convert", func(w http.ResponseWriter, r *http.Request) {
		var input trace
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		output, err := convert(input)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(output)
	})
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}
