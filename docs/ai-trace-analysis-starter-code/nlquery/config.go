// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

package nlquery

import (
	"errors"
	"fmt"
	"time"
)

// Config holds NL query parser configuration.
// Designed to be embedded in Jaeger Query Service configuration.
type Config struct {
	// Enabled controls whether NL query parsing is available
	Enabled bool `mapstructure:"enabled"`

	// Provider specifies which LLM backend to use (currently only "ollama")
	Provider string `mapstructure:"provider"`

	// Ollama contains Ollama-specific configuration
	Ollama OllamaConfig `mapstructure:"ollama"`
}

// OllamaConfig contains Ollama provider settings
type OllamaConfig struct {
	// ServerURL is the Ollama API endpoint (e.g., "http://localhost:11434")
	ServerURL string `mapstructure:"server_url"`

	// Model is the model name to use (e.g., "qwen2.5:0.5b", "phi3:mini")
	Model string `mapstructure:"model"`

	// Timeout is the maximum duration for LLM requests
	Timeout time.Duration `mapstructure:"timeout"`

	// Temperature controls randomness (0.0 = deterministic)
	Temperature float64 `mapstructure:"temperature"`

	// MaxTokens limits the response length
	MaxTokens int `mapstructure:"max_tokens"`
}

// DefaultConfig returns a Config with sensible defaults
func DefaultConfig() Config {
	return Config{
		Enabled:  false, // Opt-in feature
		Provider: "ollama",
		Ollama: OllamaConfig{
			ServerURL:   "http://localhost:11434",
			Model:       "qwen2.5:0.5b",
			Timeout:     10 * time.Second,
			Temperature: 0.0, // Deterministic
			MaxTokens:   256,
		},
	}
}

// Validate checks the configuration for errors
func (c *Config) Validate() error {
	if !c.Enabled {
		return nil // No validation needed if disabled
	}

	if c.Provider == "" {
		return errors.New("nlquery.provider is required when enabled")
	}

	if c.Provider != "ollama" {
		return fmt.Errorf("nlquery.provider '%s' is not supported, only 'ollama' is available", c.Provider)
	}

	return c.Ollama.Validate()
}

// Validate checks OllamaConfig for errors
func (c *OllamaConfig) Validate() error {
	if c.ServerURL == "" {
		return errors.New("nlquery.ollama.server_url is required")
	}

	if c.Model == "" {
		return errors.New("nlquery.ollama.model is required")
	}

	if c.Timeout <= 0 {
		return errors.New("nlquery.ollama.timeout must be positive")
	}

	if c.Temperature < 0 || c.Temperature > 2 {
		return fmt.Errorf("nlquery.ollama.temperature must be between 0 and 2, got %f", c.Temperature)
	}

	if c.MaxTokens <= 0 {
		return errors.New("nlquery.ollama.max_tokens must be positive")
	}

	return nil
}
