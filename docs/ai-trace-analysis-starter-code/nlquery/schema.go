// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

package nlquery

import (
	"fmt"
	"time"
)

// SearchParams represents extracted search parameters from natural language.
// All fields are pointers to distinguish between "not mentioned" (nil) and "explicit value".
// Maps directly to Jaeger v3 TraceQueryParameters.
type SearchParams struct {
	// ServiceName filters traces by service name
	ServiceName *string `json:"service,omitempty"`

	// OperationName filters traces by operation/span name
	OperationName *string `json:"operation,omitempty"`

	// Tags are key-value attribute filters
	// Example: {"http.status_code": "500", "error": "true"}
	Tags map[string]string `json:"tags,omitempty"`

	// MinDuration filters traces with duration >= this value
	// Format: Go duration string (e.g., "2s", "500ms", "1m30s")
	MinDuration *string `json:"minDuration,omitempty"`

	// MaxDuration filters traces with duration <= this value
	// Format: Go duration string (e.g., "2s", "500ms", "1m30s")
	MaxDuration *string `json:"maxDuration,omitempty"`

	// Error filters traces that contain error spans
	// true = only errors, false = only success, nil = no filter
	Error *bool `json:"error,omitempty"`

	// Limit restricts the number of results (max 1000)
	Limit *int `json:"limit,omitempty"`
}

// Validate checks SearchParams for semantic correctness.
// Returns an error if any field contains an invalid value.
func (p *SearchParams) Validate() error {
	// Validate duration formats
	if p.MinDuration != nil {
		if _, err := time.ParseDuration(*p.MinDuration); err != nil {
			return fmt.Errorf("invalid minDuration '%s': %w", *p.MinDuration, err)
		}
	}

	if p.MaxDuration != nil {
		if _, err := time.ParseDuration(*p.MaxDuration); err != nil {
			return fmt.Errorf("invalid maxDuration '%s': %w", *p.MaxDuration, err)
		}
	}

	// Validate min <= max if both specified
	if p.MinDuration != nil && p.MaxDuration != nil {
		minDur, _ := time.ParseDuration(*p.MinDuration)
		maxDur, _ := time.ParseDuration(*p.MaxDuration)
		if minDur > maxDur {
			return fmt.Errorf("minDuration (%s) cannot exceed maxDuration (%s)",
				*p.MinDuration, *p.MaxDuration)
		}
	}

	// Validate limit range
	if p.Limit != nil {
		if *p.Limit < 1 {
			return fmt.Errorf("limit must be at least 1, got %d", *p.Limit)
		}
		if *p.Limit > 1000 {
			return fmt.Errorf("limit cannot exceed 1000, got %d", *p.Limit)
		}
	}

	return nil
}

// ToQueryParams converts SearchParams to a map suitable for Jaeger API calls.
// Only non-nil fields are included in the result.
func (p *SearchParams) ToQueryParams() map[string]interface{} {
	result := make(map[string]interface{})

	if p.ServiceName != nil {
		result["service"] = *p.ServiceName
	}
	if p.OperationName != nil {
		result["operation"] = *p.OperationName
	}
	if p.MinDuration != nil {
		result["minDuration"] = *p.MinDuration
	}
	if p.MaxDuration != nil {
		result["maxDuration"] = *p.MaxDuration
	}
	if p.Tags != nil && len(p.Tags) > 0 {
		result["tags"] = p.Tags
	}
	if p.Limit != nil {
		result["limit"] = *p.Limit
	}
	// Note: 'error' field may need special handling in Jaeger API

	return result
}

// IsEmpty returns true if no parameters were extracted from the query.
func (p *SearchParams) IsEmpty() bool {
	return p.ServiceName == nil &&
		p.OperationName == nil &&
		len(p.Tags) == 0 &&
		p.MinDuration == nil &&
		p.MaxDuration == nil &&
		p.Error == nil &&
		p.Limit == nil
}

// GetMinDuration returns the parsed MinDuration or zero if not set.
func (p *SearchParams) GetMinDuration() time.Duration {
	if p.MinDuration == nil {
		return 0
	}
	d, _ := time.ParseDuration(*p.MinDuration)
	return d
}

// GetMaxDuration returns the parsed MaxDuration or zero if not set.
func (p *SearchParams) GetMaxDuration() time.Duration {
	if p.MaxDuration == nil {
		return 0
	}
	d, _ := time.ParseDuration(*p.MaxDuration)
	return d
}
