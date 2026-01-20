// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import DetailState from '../components/TracePage/TraceTimelineViewer/SpanDetail/DetailState';
import TNil from './TNil';

type TTraceTimeline = {
  childrenHiddenIDs: Set<string>;
  detailStates: Map<string, DetailState>;
  hoverIndentGuideIds: Set<string>;
  shouldScrollToFirstUiFindMatch: boolean;
  spanNameColumnWidth: number;
  traceID: string | TNil;
};

export default TTraceTimeline;
