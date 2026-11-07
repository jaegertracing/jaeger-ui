// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// The v3 schema parses proto3's "NaN", "Infinity", and "-Infinity" doubleValues into numbers,
// which JSON.stringify writes as null. Write them back as proto3 strings.
const proto3Doubles = (key: string, value: unknown) =>
  key === 'doubleValue' && typeof value === 'number' && !Number.isFinite(value) ? String(value) : value;

/** Serializes wire traces in the `{"data": [...]}` shape that the upload path reads back. */
export function createBlob(traces: unknown[]) {
  return new Blob([`{"data":${JSON.stringify(traces, proto3Doubles)}}`], { type: 'application/json' });
}

export function downloadTraces(traces: unknown[], fileName: string) {
  const element = document.createElement('a');
  element.href = URL.createObjectURL(createBlob(traces));
  element.download = fileName;
  document.body.appendChild(element);
  element.click();
  URL.revokeObjectURL(element.href);
  element.remove();
}
