// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

package nlquery

import (
	"context"
	"fmt"

	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/ollama"
)

// LLMProvider abstracts LLM generation for testability and extensibility.
// Implementations must be safe for concurrent use.
type LLMProvider interface {
	// Generate sends a prompt to the LLM and returns the raw response string.
	// The response should ideally be JSON, but may include LLM artifacts
	// (markdown code blocks, explanations) that need to be extracted.
	Generate(ctx context.Context, prompt string) (string, error)
}

// OllamaProvider implements LLMProvider using Ollama via LangChainGo.
// It connects to a local Ollama instance running the specified model.
type OllamaProvider struct {
	llm    llms.Model
	config OllamaConfig
}

// NewOllamaProvider creates a new Ollama-backed LLM provider.
// Returns an error if the Ollama client cannot be initialized.
func NewOllamaProvider(cfg OllamaConfig) (*OllamaProvider, error) {
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	opts := []ollama.Option{
		ollama.WithModel(cfg.Model),
		ollama.WithServerURL(cfg.ServerURL),
	}

	llm, err := ollama.New(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize ollama client: %w", err)
	}

	return &OllamaProvider{
		llm:    llm,
		config: cfg,
	}, nil
}

// Generate implements LLMProvider.
// It sends the prompt to Ollama and returns the raw response.
func (p *OllamaProvider) Generate(ctx context.Context, prompt string) (string, error) {
	// Apply timeout from config
	ctx, cancel := context.WithTimeout(ctx, p.config.Timeout)
	defer cancel()

	// Use deterministic settings from config
	response, err := llms.GenerateFromSinglePrompt(ctx, p.llm, prompt,
		llms.WithTemperature(p.config.Temperature),
		llms.WithMaxTokens(p.config.MaxTokens),
	)
	if err != nil {
		return "", fmt.Errorf("ollama generation failed: %w", err)
	}

	return response, nil
}

// Model returns the configured model name.
func (p *OllamaProvider) Model() string {
	return p.config.Model
}

// ServerURL returns the configured Ollama server URL.
func (p *OllamaProvider) ServerURL() string {
	return p.config.ServerURL
}
