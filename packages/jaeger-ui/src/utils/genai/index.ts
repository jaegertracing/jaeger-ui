// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// Re-exports the canonical GenAI span detection utility. SpanDetail and other
// consumers import from this folder path rather than `./detect` directly, so
// this barrel keeps that import path working without a duplicate implementation.
export * from './detect';
