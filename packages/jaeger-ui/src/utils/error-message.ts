// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export const MAX_DETAIL_LENGTH = 1024;

export function truncateErrorDetail(detail: string | undefined): string | undefined {
  return detail && detail.length > MAX_DETAIL_LENGTH
    ? `${detail.slice(0, MAX_DETAIL_LENGTH - 3).trim()}...`
    : detail;
}

function readMessage(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'message' in value && typeof value.message === 'string') {
    return value.message.trim() ? value.message : undefined;
  }
  return undefined;
}

export function getErrorBodyMessage(body: string | undefined): string | undefined {
  if (!body) return body;
  try {
    const data: unknown = JSON.parse(body);
    const nested = data && typeof data === 'object' && 'error' in data ? data.error : undefined;
    return readMessage(data) || readMessage(nested) || body;
  } catch {
    return body;
  }
}
