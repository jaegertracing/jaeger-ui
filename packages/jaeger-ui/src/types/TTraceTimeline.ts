// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import DetailState from '../components/TracePage/TraceTimelineViewer/SpanDetail/DetailState';
import TNil from './TNil';
import type { SpanDetailPanelMode } from './config';

type TTraceTimeline = {
  childrenHiddenIDs: Set<string>;
  detailStates: Map<string, DetailState>;
  detailPanelMode: SpanDetailPanelMode;
  hoverIndentGuideIds: Set<string>;
  shouldScrollToFirstUiFindMatch: boolean;
  sidePanelWidth: number;
  spanNameColumnWidth: number;
  timelineBarsVisible: boolean;
  traceID: string | TNil;
};

export default TTraceTimeline;
