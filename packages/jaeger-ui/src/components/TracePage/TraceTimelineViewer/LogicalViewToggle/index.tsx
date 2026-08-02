// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback } from 'react';
import { Tooltip } from 'antd';
import { IoGitNetwork, IoGitNetworkOutline } from 'react-icons/io5';

import { isSpanPruned } from '../generateRowStates';
import { getSelectedSpanID, selectEffectivePrunedServices, useTraceTimelineStore } from '../store';
import { IOtelTrace } from '../../../../types/otel';
import type { SpanDetailPanelMode } from '../../../../types/config';

import './LogicalViewToggle.css';

type LogicalViewToggleProps = {
  trace: IOtelTrace;
  detailPanelMode: SpanDetailPanelMode;
};

/**
 * Toggle that hides every service with zero GenAI spans, approximating the agent's
 * "logical" flow by folding away infrastructure services. Per yurishkuro's steer on
 * jaegertracing/jaeger-ui#4272, this reuses the service filter's own pruning mechanism
 * rather than a new span-level predicate: `logicalViewPrunedServices` (computed once per
 * trace in store.timeline.ts) is unioned into the effective pruned set through
 * `selectEffectivePrunedServices` when this toggle is on.
 */
export default function LogicalViewToggle({ trace, detailPanelMode }: LogicalViewToggleProps) {
  const logicalViewEnabled = useTraceTimelineStore(s => s.logicalViewEnabled);
  const logicalViewPrunedServices = useTraceTimelineStore(s => s.logicalViewPrunedServices);
  const setLogicalViewEnabled = useTraceTimelineStore(s => s.setLogicalViewEnabled);

  const handleToggle = useCallback(() => {
    const nextEnabled = !logicalViewEnabled;
    setLogicalViewEnabled(nextEnabled);

    // Mirrors useServiceFilter's handleServiceFilterApply: if enabling the toggle hides
    // the span currently open in the side panel, deselect it rather than leaving a
    // side panel pointed at a row that no longer renders.
    if (nextEnabled && detailPanelMode === 'sidepanel') {
      const nextPruned = selectEffectivePrunedServices({
        ...useTraceTimelineStore.getState(),
        logicalViewEnabled: true,
      });
      const currentSelectedID = getSelectedSpanID(useTraceTimelineStore.getState().detailStates);
      if (currentSelectedID) {
        const selectedSpan = trace.spanMap.get(currentSelectedID);
        if (selectedSpan && isSpanPruned(selectedSpan, nextPruned)) {
          useTraceTimelineStore.setState({ detailStates: new Map() });
        }
      }
    }
  }, [logicalViewEnabled, setLogicalViewEnabled, detailPanelMode, trace.spanMap]);

  // Nothing to hide: no GenAI spans in this trace, or every service already has some.
  if (logicalViewPrunedServices.size === 0) {
    return null;
  }

  const label = logicalViewEnabled
    ? 'Show infrastructure services'
    : 'Hide infrastructure services, show only the GenAI/agent flow';

  return (
    <Tooltip title={label}>
      <span
        className={`LogicalViewToggle--button ${logicalViewEnabled ? 'is-active' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={logicalViewEnabled}
        data-testid="logical-view-toggle-button"
        onClick={handleToggle}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        {logicalViewEnabled ? <IoGitNetwork /> : <IoGitNetworkOutline />}
      </span>
    </Tooltip>
  );
}
