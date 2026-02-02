// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Package nlquery provides natural language to Jaeger search parameter parsing.
//
// This package enables users to express trace search queries in natural language,
// which are then converted to structured Jaeger TraceQueryParameters using a
// local Small Language Model (SLM) via Ollama.
//
// Example usage:
//
//	provider, _ := nlquery.NewOllamaProvider(nlquery.OllamaConfig{
//	    ServerURL: "http://localhost:11434",
//	    Model:     "qwen2.5:0.5b",
//	    Timeout:   10 * time.Second,
//	})
//	parser := nlquery.NewParser(provider)
//	params, err := parser.ParseNLQueryToSearchParams(ctx, "500 errors from payment-service")
//
// The package is designed to be:
//   - Local-first: Uses Ollama with small models, no external API calls
//   - Deterministic: Temperature=0, strict JSON output validation
//   - Extensible: LLMProvider interface allows swapping implementations
package nlquery
