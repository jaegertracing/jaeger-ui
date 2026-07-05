// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';

import { useConfig } from '../../../hooks/useConfig';
import { IOtelTrace } from '../../../types/otel';
import { buildSpanPills, ISpanPill } from './spanPills';

export function useSpanPills(trace: IOtelTrace): Map<string, ISpanPill[]> {
  const enabled = useConfig().traceTimeline?.spanPillsEnabled === true;
  return useMemo(() => (enabled ? buildSpanPills(trace) : new Map()), [enabled, trace]);
}
