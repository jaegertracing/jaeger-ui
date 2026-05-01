// Copyright (c) 2024 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { AttributeValue } from '../../../../types/otel';

export function formatAttributeValue(value: AttributeValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === 'object' && !(value instanceof Uint8Array)) {
    return '{...}';
  }
  return String(value);
}
