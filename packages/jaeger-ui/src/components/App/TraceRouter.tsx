// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useParams } from 'react-router-dom';
import TraceDiff from '../TraceDiff';
import TracePage from '../TracePage';
import { isCompareTraceRouteId } from './jaegerOmnibox';

/*
React Router v6 cannot correctly match the old TraceDiff path (/trace/:a?\.\.\.":b?), so we don’t use that route anymore.
Instead, both “single trace” and “compare two traces” URLs are matched by one route: /trace/:id.
Compare URLs use abc...def with two valid hex IDs; malformed ids (e.g. multiple ...) stay on TracePage, same as the omnibox.
*/
export default function TraceRouter() {
  const { id = '' } = useParams<{ id: string }>();
  if (isCompareTraceRouteId(id)) {
    return <TraceDiff />;
  }

  return <TracePage />;
}
