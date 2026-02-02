# AI-Powered Trace Analysis - Starter Code

This directory contains ready-to-use Go code for the LFX Mentorship project:
**"AI-Powered Trace Analysis with Local LLM Support"**

## Overview

This starter code implements **Feature 1: Natural Language → Jaeger Search Parameters**.

Users can write queries like:
- "Show me 500 errors from payment-service taking more than 2 seconds"
- "Find slow traces for checkout operation, latency above 1s, limit 50"
- "auth-service errors"

And get structured Jaeger search parameters back.

## Files

```
nlquery/
├── doc.go           # Package documentation
├── config.go        # YAML configuration structs
├── schema.go        # SearchParams definition + validation
├── prompt.go        # System prompt + few-shot examples
├── provider.go      # LLMProvider interface + Ollama implementation
├── parser.go        # Core NL → SearchParams logic
├── parser_test.go   # Comprehensive table-driven tests
└── go.mod           # Module definition

example-config.yaml  # Jaeger v2 configuration example
```

## Prerequisites

1. **Go 1.22+**
2. **Ollama** installed and running:
   ```bash
   # Install Ollama (macOS)
   brew install ollama

   # Start Ollama server
   ollama serve

   # Pull a small model
   ollama pull qwen2.5:0.5b
   ```

## Running Tests

```bash
cd nlquery

# Install dependencies
go mod tidy

# Run tests
go test -v ./...

# Run tests with coverage
go test -v -cover ./...
```

## Integration with Jaeger

This code is designed to be placed in the Jaeger repository at:
```
cmd/jaeger/internal/extension/jaegerquery/nlquery/
```

To integrate:

1. Copy the `nlquery/` directory to the Jaeger codebase
2. Update the Jaeger Query Service extension to use the parser
3. Add configuration loading for the `nlquery` section
4. Wire up an HTTP/gRPC endpoint for NL queries

## Example Usage

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/jaegertracing/jaeger/cmd/jaeger/internal/extension/jaegerquery/nlquery"
)

func main() {
    // Create provider
    provider, err := nlquery.NewOllamaProvider(nlquery.OllamaConfig{
        ServerURL:   "http://localhost:11434",
        Model:       "qwen2.5:0.5b",
        Timeout:     10 * time.Second,
        Temperature: 0.0,
        MaxTokens:   256,
    })
    if err != nil {
        log.Fatal(err)
    }

    // Create parser
    parser := nlquery.NewParser(provider)

    // Parse a natural language query
    params, err := parser.ParseNLQueryToSearchParams(
        context.Background(),
        "Show me 500 errors from payment-service taking more than 2 seconds",
    )
    if err != nil {
        log.Fatal(err)
    }

    // Use the extracted parameters
    fmt.Printf("Service: %v\n", *params.ServiceName)
    fmt.Printf("MinDuration: %v\n", *params.MinDuration)
    fmt.Printf("Error: %v\n", *params.Error)
    fmt.Printf("Tags: %v\n", params.Tags)
}
```

## Recommended Models

| Model | Size | Speed | Accuracy | Notes |
|-------|------|-------|----------|-------|
| `qwen2.5:0.5b` | 0.5B | ⚡ Fastest | Good | **Primary recommendation** |
| `phi3:mini` | 3.8B | Medium | Better | Use if accuracy issues with Qwen |
| `llama3.2:1b` | 1B | Fast | Good | Alternative option |

## What's NOT Included

This starter code intentionally does NOT include:

- ❌ UI components
- ❌ Streaming responses
- ❌ Multiple model providers (OpenAI, etc.)
- ❌ Trace summarization
- ❌ Smart filtering
- ❌ Time range parsing ("last hour")

These are explicitly out of scope for the initial PR as per the proposal.

## License

Apache-2.0 (consistent with Jaeger)
