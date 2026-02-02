// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

package nlquery

import "fmt"

// systemPrompt contains the core instructions for the LLM.
// Optimized for Small Language Models (SLMs) - short, rule-based.
const systemPrompt = `You are a Jaeger trace query parameter extractor.
Your ONLY job is to extract search parameters from natural language queries.

RULES:
1. Output ONLY valid JSON. No explanations. No markdown code blocks.
2. Use ONLY these fields: service, operation, tags, minDuration, maxDuration, error, limit
3. Duration format: number + unit (e.g., "2s", "500ms", "1m")
4. For HTTP errors (4xx, 5xx), set error:true AND add http.status_code to tags
5. If a field is not mentioned, DO NOT include it in output
6. Never invent or guess values not explicitly stated in the query

OUTPUT: Single-line JSON object`

// fewShotExamples provides concrete examples for the LLM to learn from.
// Kept minimal (3 examples) for SLM context window efficiency.
const fewShotExamples = `
EXAMPLES:

Query: "Show me 500 errors from payment-service taking more than 2 seconds"
Output: {"service":"payment-service","tags":{"http.status_code":"500"},"minDuration":"2s","error":true}

Query: "Find slow traces for checkout operation, latency above 1s, limit 50"
Output: {"operation":"checkout","minDuration":"1s","limit":50}

Query: "auth-service errors"
Output: {"service":"auth-service","error":true}`

// BuildPrompt constructs the full prompt for the LLM.
// Combines system prompt, few-shot examples, and the user's query.
func BuildPrompt(userQuery string) string {
	return fmt.Sprintf(`%s

%s

Query: "%s"
Output:`, systemPrompt, fewShotExamples, userQuery)
}

// GetSystemPrompt returns the system prompt for testing or debugging.
func GetSystemPrompt() string {
	return systemPrompt
}

// GetFewShotExamples returns the few-shot examples for testing or debugging.
func GetFewShotExamples() string {
	return fewShotExamples
}
