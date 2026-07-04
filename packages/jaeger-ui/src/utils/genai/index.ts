// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IOtelSpan } from '../../types/otel';

export function isGenAISpan(span: IOtelSpan): boolean {
  return span.attributes.some(attr => attr.key.startsWith('gen_ai.'));
}
