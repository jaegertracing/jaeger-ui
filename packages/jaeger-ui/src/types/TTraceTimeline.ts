// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import DetailState from '../components/TracePage/TraceTimelineViewer/SpanDetail/DetailState';
import TNil from './TNil';

// Layout preferences (detailPanelMode, sidePanelWidth, spanNameColumnWidth, timelineBarsVisible)
// are owned by useLayoutPrefsStore (./store.layout); this type only covers what the Redux
// duck still tracks as the analytics parity reference (see store.track.test.ts).
type TTraceTimeline = {
  childrenHiddenIDs: Set<string>;
  detailStates: Map<string, DetailState>;
  shouldScrollToFirstUiFindMatch: boolean;
  traceID: string | TNil;
};

export default TTraceTimeline;
