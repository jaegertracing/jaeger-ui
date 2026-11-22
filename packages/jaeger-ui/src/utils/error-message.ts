// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export const MAX_DETAIL_LENGTH = 1024;

export function truncateErrorDetail(detail: string | undefined): string | undefined {
  return detail && detail.length > MAX_DETAIL_LENGTH
    ? `${detail.slice(0, MAX_DETAIL_LENGTH - 3).trim()}...`
    : detail;
}
