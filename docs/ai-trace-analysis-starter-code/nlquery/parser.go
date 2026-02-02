// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

package nlquery

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var (
	// ErrEmptyQuery indicates an empty or whitespace-only user query.
	ErrEmptyQuery = errors.New("query cannot be empty")

	// ErrInvalidJSON indicates the LLM returned non-JSON output.
	ErrInvalidJSON = errors.New("LLM returned invalid JSON")

	// ErrValidationFailed indicates extracted params failed validation.
	ErrValidationFailed = errors.New("extracted parameters failed validation")

	// ErrLLMFailure indicates the LLM provider returned an error.
	ErrLLMFailure = errors.New("LLM generation failed")
)

// Parser converts natural language queries to structured SearchParams.
// It uses an LLMProvider to parse queries and validates the result.
type Parser struct {
	provider LLMProvider
}

// NewParser creates a new NL query parser with the given LLM provider.
func NewParser(provider LLMProvider) *Parser {
	if provider == nil {
		panic("nlquery: provider cannot be nil")
	}
	return &Parser{provider: provider}
}

// ParseNLQueryToSearchParams extracts SearchParams from a natural language query.
//
// The process:
//  1. Validates input is non-empty
//  2. Builds a prompt with system instructions and few-shot examples
//  3. Calls the LLM provider
//  4. Extracts JSON from the response (handles LLM quirks like markdown blocks)
//  5. Unmarshals to SearchParams
//  6. Validates the extracted parameters
//
// Returns an error if any step fails. The error will wrap one of:
// ErrEmptyQuery, ErrInvalidJSON, ErrValidationFailed, or ErrLLMFailure.
func (p *Parser) ParseNLQueryToSearchParams(ctx context.Context, userQuery string) (*SearchParams, error) {
	// 1. Input validation
	userQuery = strings.TrimSpace(userQuery)
	if userQuery == "" {
		return nil, ErrEmptyQuery
	}

	// 2. Build prompt
	prompt := BuildPrompt(userQuery)

	// 3. Call LLM
	rawResponse, err := p.provider.Generate(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrLLMFailure, err)
	}

	// 4. Extract JSON from response
	jsonStr := extractJSON(rawResponse)
	if jsonStr == "" {
		return nil, fmt.Errorf("%w: no JSON found in response: %q", ErrInvalidJSON, truncate(rawResponse, 100))
	}

	// 5. Unmarshal to struct
	var params SearchParams
	if err := json.Unmarshal([]byte(jsonStr), &params); err != nil {
		return nil, fmt.Errorf("%w: %v (raw JSON: %q)", ErrInvalidJSON, err, truncate(jsonStr, 100))
	}

	// 6. Validate extracted parameters
	if err := params.Validate(); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrValidationFailed, err)
	}

	return &params, nil
}

// extractJSON attempts to extract a JSON object from potentially noisy LLM output.
// SLMs sometimes wrap JSON in markdown code blocks or add explanatory text.
func extractJSON(response string) string {
	response = strings.TrimSpace(response)

	// Fast path: response is already clean JSON
	if strings.HasPrefix(response, "{") && strings.HasSuffix(response, "}") {
		// Verify it's valid JSON before returning
		if json.Valid([]byte(response)) {
			return response
		}
	}

	// Try to extract from markdown code blocks: ```json ... ``` or ``` ... ```
	codeBlockRe := regexp.MustCompile("(?s)```(?:json)?\\s*({.+?})\\s*```")
	if matches := codeBlockRe.FindStringSubmatch(response); len(matches) > 1 {
		candidate := strings.TrimSpace(matches[1])
		if json.Valid([]byte(candidate)) {
			return candidate
		}
	}

	// Fallback: find first { to last } and hope for the best
	start := strings.Index(response, "{")
	end := strings.LastIndex(response, "}")
	if start != -1 && end > start {
		candidate := response[start : end+1]
		if json.Valid([]byte(candidate)) {
			return candidate
		}
	}

	return ""
}

// truncate shortens a string for error messages
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
