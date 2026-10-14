// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useCallback } from 'react';
import { Tooltip } from 'antd';
import { IoGitNetwork, IoGitNetworkOutline } from 'react-icons/io5';

import { isSpanPruned } from '../generateRowStates';
import { getSelectedSpanID, selectEffectivePrunedServices, useTraceTimelineStore } from '../store';
import { IOtelTrace } from '../../../../types/otel';
import type { SpanDetailPanelMode } from '../../../../types/config';

import '../HeaderIconButton.css';

type HideNonGenAIServicesToggleProps = {
  trace: IOtelTrace;
  detailPanelMode: SpanDetailPanelMode;
};

/**
 * Toggle that hides every service with no GenAI span at or below it, reusing the service
 * filter's own pruning mechanism rather than a new span-level predicate. When on,
 * `nonGenAIServicesToHide` (computed once per trace in store.timeline.ts) is unioned
 * into the effective pruned set through `selectEffectivePrunedServices`.
 */
export default function HideNonGenAIServicesToggle({
  trace,
  detailPanelMode,
}: HideNonGenAIServicesToggleProps) {
  const hideNonGenAIServicesEnabled = useTraceTimelineStore(s => s.hideNonGenAIServicesEnabled);
  const nonGenAIServicesToHide = useTraceTimelineStore(s => s.nonGenAIServicesToHide);
  const setHideNonGenAIServicesEnabled = useTraceTimelineStore(s => s.setHideNonGenAIServicesEnabled);

  const handleToggle = useCallback(() => {
    const nextEnabled = !hideNonGenAIServicesEnabled;
    setHideNonGenAIServicesEnabled(nextEnabled);

    // Mirrors useServiceFilter's handleServiceFilterApply: if enabling the toggle hides
    // the span currently open in the side panel, deselect it rather than leaving a
    // side panel pointed at a row that no longer renders.
    if (nextEnabled && detailPanelMode === 'sidepanel') {
      const nextPruned = selectEffectivePrunedServices({
        ...useTraceTimelineStore.getState(),
        hideNonGenAIServicesEnabled: true,
      });
      const currentSelectedID = getSelectedSpanID(useTraceTimelineStore.getState().detailStates);
      if (currentSelectedID) {
        const selectedSpan = trace.spanMap.get(currentSelectedID);
        if (selectedSpan && isSpanPruned(selectedSpan, nextPruned)) {
          useTraceTimelineStore.setState({ detailStates: new Map() });
        }
      }
    }
  }, [hideNonGenAIServicesEnabled, setHideNonGenAIServicesEnabled, detailPanelMode, trace.spanMap]);

  // Nothing to hide: no GenAI spans in this trace, or every service already has some.
  if (nonGenAIServicesToHide.size === 0) {
    return null;
  }

  const label = hideNonGenAIServicesEnabled ? 'Show all services' : 'Hide services with no GenAI spans';

  return (
    <Tooltip title={label}>
      <span
        className={`TimelineHeaderIconButton ${hideNonGenAIServicesEnabled ? 'is-active' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={hideNonGenAIServicesEnabled}
        data-testid="hide-non-genai-services-toggle-button"
        onClick={handleToggle}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
      >
        {hideNonGenAIServicesEnabled ? <IoGitNetwork /> : <IoGitNetworkOutline />}
      </span>
    </Tooltip>
  );
}
