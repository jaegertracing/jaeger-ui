// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

package nlquery

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ptr is a helper to create pointers to values in test literals
func ptr[T any](v T) *T { return &v }

// MockProvider implements LLMProvider for testing
type MockProvider struct {
	Response string
	Err      error
}

func (m *MockProvider) Generate(ctx context.Context, prompt string) (string, error) {
	if m.Err != nil {
		return "", m.Err
	}
	return m.Response, nil
}

func TestParseNLQueryToSearchParams(t *testing.T) {
	tests := []struct {
		name         string
		userQuery    string
		mockResponse string
		mockErr      error
		expected     *SearchParams
		expectErrIs  error
		expectErrMsg string
	}{
		// === Success Cases ===
		{
			name:         "500 errors from payment-service with latency",
			userQuery:    "Show me 500 errors from payment-service taking more than 2 seconds",
			mockResponse: `{"service":"payment-service","tags":{"http.status_code":"500"},"minDuration":"2s","error":true}`,
			expected: &SearchParams{
				ServiceName: ptr("payment-service"),
				Tags:        map[string]string{"http.status_code": "500"},
				MinDuration: ptr("2s"),
				Error:       ptr(true),
			},
		},
		{
			name:         "checkout operation with latency and limit",
			userQuery:    "Find slow traces for checkout operation, latency above 1s, limit 50",
			mockResponse: `{"operation":"checkout","minDuration":"1s","limit":50}`,
			expected: &SearchParams{
				OperationName: ptr("checkout"),
				MinDuration:   ptr("1s"),
				Limit:         ptr(50),
			},
		},
		{
			name:         "simple service errors",
			userQuery:    "auth-service errors",
			mockResponse: `{"service":"auth-service","error":true}`,
			expected: &SearchParams{
				ServiceName: ptr("auth-service"),
				Error:       ptr(true),
			},
		},
		{
			name:         "tag-based query",
			userQuery:    "traces where user.id equals 12345",
			mockResponse: `{"tags":{"user.id":"12345"}}`,
			expected: &SearchParams{
				Tags: map[string]string{"user.id": "12345"},
			},
		},
		{
			name:         "duration range query",
			userQuery:    "traces between 100ms and 5s",
			mockResponse: `{"minDuration":"100ms","maxDuration":"5s"}`,
			expected: &SearchParams{
				MinDuration: ptr("100ms"),
				MaxDuration: ptr("5s"),
			},
		},
		{
			name:         "complex query with multiple fields",
			userQuery:    "payment-service processOrder operation with errors and latency over 500ms limit 100",
			mockResponse: `{"service":"payment-service","operation":"processOrder","minDuration":"500ms","error":true,"limit":100}`,
			expected: &SearchParams{
				ServiceName:   ptr("payment-service"),
				OperationName: ptr("processOrder"),
				MinDuration:   ptr("500ms"),
				Error:         ptr(true),
				Limit:         ptr(100),
			},
		},
		{
			name:         "only limit specified",
			userQuery:    "show me 20 traces",
			mockResponse: `{"limit":20}`,
			expected: &SearchParams{
				Limit: ptr(20),
			},
		},
		{
			name:         "microsecond duration",
			userQuery:    "traces faster than 100 microseconds",
			mockResponse: `{"maxDuration":"100us"}`,
			expected: &SearchParams{
				MaxDuration: ptr("100us"),
			},
		},

		// === JSON Extraction Edge Cases ===
		{
			name:         "handles markdown code block in response",
			userQuery:    "payment errors",
			mockResponse: "```json\n{\"service\":\"payment\",\"error\":true}\n```",
			expected: &SearchParams{
				ServiceName: ptr("payment"),
				Error:       ptr(true),
			},
		},
		{
			name:         "handles markdown code block without json tag",
			userQuery:    "payment errors",
			mockResponse: "```\n{\"service\":\"payment\",\"error\":true}\n```",
			expected: &SearchParams{
				ServiceName: ptr("payment"),
				Error:       ptr(true),
			},
		},
		{
			name:         "handles JSON with surrounding text",
			userQuery:    "payment errors",
			mockResponse: "Here is the result: {\"service\":\"payment\"} That's all.",
			expected: &SearchParams{
				ServiceName: ptr("payment"),
			},
		},
		{
			name:         "handles extra whitespace in JSON",
			userQuery:    "auth service",
			mockResponse: "  \n{\"service\":\"auth\"}\n  ",
			expected: &SearchParams{
				ServiceName: ptr("auth"),
			},
		},

		// === Error Cases ===
		{
			name:        "empty query returns error",
			userQuery:   "",
			expectErrIs: ErrEmptyQuery,
		},
		{
			name:        "whitespace-only query returns error",
			userQuery:   "   \t\n  ",
			expectErrIs: ErrEmptyQuery,
		},
		{
			name:         "invalid JSON response",
			userQuery:    "find traces",
			mockResponse: "I don't understand your query",
			expectErrIs:  ErrInvalidJSON,
		},
		{
			name:         "malformed JSON response",
			userQuery:    "find traces",
			mockResponse: `{"service": "test", invalid}`,
			expectErrIs:  ErrInvalidJSON,
		},
		{
			name:         "empty JSON object is valid but empty",
			userQuery:    "nothing specific",
			mockResponse: `{}`,
			expected:     &SearchParams{},
		},
		{
			name:         "invalid duration format in minDuration",
			userQuery:    "traces over 2 seconds",
			mockResponse: `{"minDuration":"2sec"}`,
			expectErrIs:  ErrValidationFailed,
			expectErrMsg: "invalid minDuration",
		},
		{
			name:         "invalid duration format in maxDuration",
			userQuery:    "traces under 2 seconds",
			mockResponse: `{"maxDuration":"2 seconds"}`,
			expectErrIs:  ErrValidationFailed,
			expectErrMsg: "invalid maxDuration",
		},
		{
			name:         "minDuration exceeds maxDuration",
			userQuery:    "traces between 10s and 2s",
			mockResponse: `{"minDuration":"10s","maxDuration":"2s"}`,
			expectErrIs:  ErrValidationFailed,
			expectErrMsg: "cannot exceed",
		},
		{
			name:         "limit too high",
			userQuery:    "show all traces",
			mockResponse: `{"limit":9999}`,
			expectErrIs:  ErrValidationFailed,
			expectErrMsg: "cannot exceed 1000",
		},
		{
			name:         "limit zero",
			userQuery:    "show no traces",
			mockResponse: `{"limit":0}`,
			expectErrIs:  ErrValidationFailed,
			expectErrMsg: "must be at least 1",
		},
		{
			name:         "limit negative",
			userQuery:    "show negative traces",
			mockResponse: `{"limit":-5}`,
			expectErrIs:  ErrValidationFailed,
			expectErrMsg: "must be at least 1",
		},
		{
			name:        "LLM error propagates",
			userQuery:   "find traces",
			mockErr:     errors.New("connection refused"),
			expectErrIs: ErrLLMFailure,
		},
		{
			name:        "LLM timeout error",
			userQuery:   "find traces",
			mockErr:     context.DeadlineExceeded,
			expectErrIs: ErrLLMFailure,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &MockProvider{
				Response: tt.mockResponse,
				Err:      tt.mockErr,
			}
			parser := NewParser(mock)

			result, err := parser.ParseNLQueryToSearchParams(context.Background(), tt.userQuery)

			if tt.expectErrIs != nil {
				require.Error(t, err)
				assert.ErrorIs(t, err, tt.expectErrIs)
				if tt.expectErrMsg != "" {
					assert.Contains(t, err.Error(), tt.expectErrMsg)
				}
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSearchParams_Validate(t *testing.T) {
	tests := []struct {
		name       string
		params     SearchParams
		wantErr    bool
		errContain string
	}{
		{
			name:   "empty params are valid",
			params: SearchParams{},
		},
		{
			name:   "valid minDuration only",
			params: SearchParams{MinDuration: ptr("2s")},
		},
		{
			name:   "valid maxDuration only",
			params: SearchParams{MaxDuration: ptr("5s")},
		},
		{
			name:   "valid duration range",
			params: SearchParams{MinDuration: ptr("2s"), MaxDuration: ptr("5s")},
		},
		{
			name:   "equal durations are valid",
			params: SearchParams{MinDuration: ptr("2s"), MaxDuration: ptr("2s")},
		},
		{
			name:   "valid milliseconds",
			params: SearchParams{MinDuration: ptr("500ms")},
		},
		{
			name:   "valid microseconds",
			params: SearchParams{MinDuration: ptr("100us")},
		},
		{
			name:   "valid nanoseconds",
			params: SearchParams{MinDuration: ptr("1000ns")},
		},
		{
			name:   "valid limit 1",
			params: SearchParams{Limit: ptr(1)},
		},
		{
			name:   "valid limit 1000",
			params: SearchParams{Limit: ptr(1000)},
		},
		{
			name:       "invalid minDuration format",
			params:     SearchParams{MinDuration: ptr("invalid")},
			wantErr:    true,
			errContain: "invalid minDuration",
		},
		{
			name:       "invalid maxDuration format",
			params:     SearchParams{MaxDuration: ptr("2sec")},
			wantErr:    true,
			errContain: "invalid maxDuration",
		},
		{
			name:       "min > max duration",
			params:     SearchParams{MinDuration: ptr("10s"), MaxDuration: ptr("5s")},
			wantErr:    true,
			errContain: "cannot exceed",
		},
		{
			name:       "limit too high",
			params:     SearchParams{Limit: ptr(1001)},
			wantErr:    true,
			errContain: "cannot exceed 1000",
		},
		{
			name:       "limit zero",
			params:     SearchParams{Limit: ptr(0)},
			wantErr:    true,
			errContain: "must be at least 1",
		},
		{
			name:       "limit negative",
			params:     SearchParams{Limit: ptr(-1)},
			wantErr:    true,
			errContain: "must be at least 1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.params.Validate()
			if tt.wantErr {
				require.Error(t, err)
				if tt.errContain != "" {
					assert.Contains(t, err.Error(), tt.errContain)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestSearchParams_ToQueryParams(t *testing.T) {
	tests := []struct {
		name     string
		params   SearchParams
		expected map[string]interface{}
	}{
		{
			name:     "empty params",
			params:   SearchParams{},
			expected: map[string]interface{}{},
		},
		{
			name: "all fields set",
			params: SearchParams{
				ServiceName:   ptr("payment"),
				OperationName: ptr("checkout"),
				MinDuration:   ptr("1s"),
				MaxDuration:   ptr("5s"),
				Tags:          map[string]string{"env": "prod"},
				Limit:         ptr(100),
			},
			expected: map[string]interface{}{
				"service":     "payment",
				"operation":   "checkout",
				"minDuration": "1s",
				"maxDuration": "5s",
				"tags":        map[string]string{"env": "prod"},
				"limit":       100,
			},
		},
		{
			name: "partial fields",
			params: SearchParams{
				ServiceName: ptr("auth"),
			},
			expected: map[string]interface{}{
				"service": "auth",
			},
		},
		{
			name: "empty tags map is omitted",
			params: SearchParams{
				ServiceName: ptr("test"),
				Tags:        map[string]string{},
			},
			expected: map[string]interface{}{
				"service": "test",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.params.ToQueryParams()
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSearchParams_IsEmpty(t *testing.T) {
	tests := []struct {
		name    string
		params  SearchParams
		isEmpty bool
	}{
		{
			name:    "zero value is empty",
			params:  SearchParams{},
			isEmpty: true,
		},
		{
			name:    "nil tags is empty",
			params:  SearchParams{Tags: nil},
			isEmpty: true,
		},
		{
			name:    "empty tags map is empty",
			params:  SearchParams{Tags: map[string]string{}},
			isEmpty: true,
		},
		{
			name:    "service set is not empty",
			params:  SearchParams{ServiceName: ptr("test")},
			isEmpty: false,
		},
		{
			name:    "operation set is not empty",
			params:  SearchParams{OperationName: ptr("test")},
			isEmpty: false,
		},
		{
			name:    "tags set is not empty",
			params:  SearchParams{Tags: map[string]string{"k": "v"}},
			isEmpty: false,
		},
		{
			name:    "limit set is not empty",
			params:  SearchParams{Limit: ptr(10)},
			isEmpty: false,
		},
		{
			name:    "error set is not empty",
			params:  SearchParams{Error: ptr(true)},
			isEmpty: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.isEmpty, tt.params.IsEmpty())
		})
	}
}

func TestExtractJSON(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "clean JSON",
			input:    `{"foo":"bar"}`,
			expected: `{"foo":"bar"}`,
		},
		{
			name:     "JSON with whitespace",
			input:    `   {"foo":"bar"}   `,
			expected: `{"foo":"bar"}`,
		},
		{
			name:     "markdown code block with json tag",
			input:    "```json\n{\"foo\":\"bar\"}\n```",
			expected: `{"foo":"bar"}`,
		},
		{
			name:     "markdown code block without tag",
			input:    "```\n{\"foo\":\"bar\"}\n```",
			expected: `{"foo":"bar"}`,
		},
		{
			name:     "JSON surrounded by text",
			input:    "Here is the result: {\"foo\":\"bar\"} done",
			expected: `{"foo":"bar"}`,
		},
		{
			name:     "nested JSON",
			input:    `{"outer":{"inner":"value"}}`,
			expected: `{"outer":{"inner":"value"}}`,
		},
		{
			name:     "no JSON present",
			input:    "just some text",
			expected: "",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "invalid JSON syntax",
			input:    `{"foo": bar}`,
			expected: "",
		},
		{
			name:     "only opening brace",
			input:    "{",
			expected: "",
		},
		{
			name:     "only braces wrong order",
			input:    "}{",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractJSON(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestConfig_Validate(t *testing.T) {
	tests := []struct {
		name       string
		config     Config
		wantErr    bool
		errContain string
	}{
		{
			name:   "disabled config is always valid",
			config: Config{Enabled: false},
		},
		{
			name: "valid enabled config",
			config: Config{
				Enabled:  true,
				Provider: "ollama",
				Ollama: OllamaConfig{
					ServerURL:   "http://localhost:11434",
					Model:       "qwen2.5:0.5b",
					Timeout:     10_000_000_000, // 10s in nanoseconds
					Temperature: 0.0,
					MaxTokens:   256,
				},
			},
		},
		{
			name: "missing provider",
			config: Config{
				Enabled: true,
			},
			wantErr:    true,
			errContain: "provider is required",
		},
		{
			name: "unsupported provider",
			config: Config{
				Enabled:  true,
				Provider: "openai",
			},
			wantErr:    true,
			errContain: "not supported",
		},
		{
			name: "missing server URL",
			config: Config{
				Enabled:  true,
				Provider: "ollama",
				Ollama: OllamaConfig{
					Model:     "test",
					Timeout:   10_000_000_000,
					MaxTokens: 256,
				},
			},
			wantErr:    true,
			errContain: "server_url is required",
		},
		{
			name: "missing model",
			config: Config{
				Enabled:  true,
				Provider: "ollama",
				Ollama: OllamaConfig{
					ServerURL: "http://localhost:11434",
					Timeout:   10_000_000_000,
					MaxTokens: 256,
				},
			},
			wantErr:    true,
			errContain: "model is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()
			if tt.wantErr {
				require.Error(t, err)
				if tt.errContain != "" {
					assert.Contains(t, err.Error(), tt.errContain)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestBuildPrompt(t *testing.T) {
	prompt := BuildPrompt("test query")

	// Verify prompt structure
	assert.Contains(t, prompt, "You are a Jaeger trace query parameter extractor")
	assert.Contains(t, prompt, "RULES:")
	assert.Contains(t, prompt, "EXAMPLES:")
	assert.Contains(t, prompt, `Query: "test query"`)
	assert.Contains(t, prompt, "Output:")
}

func TestNewParser_PanicOnNil(t *testing.T) {
	assert.Panics(t, func() {
		NewParser(nil)
	})
}
