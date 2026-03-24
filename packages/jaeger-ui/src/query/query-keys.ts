// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export const queryKeys = {
  services: () => ['services'] as const,

  /** @param service - When null/undefined, callers should set enabled: false on useQuery. */
  spanNames: (service: string | null | undefined) => ['spanNames', service ?? null] as const,
} as const;
