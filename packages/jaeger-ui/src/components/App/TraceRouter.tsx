// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useParams } from 'react-router-dom-v5-compat';
import TraceDiff from '../TraceDiff';
import TracePage from '../TracePage';

/*
Dispatches between TracePage and TraceDiff based on the :id route param.

React Router v6 cannot parse the v5-style regex path used by TraceDiff
(`/trace/:a?\.\.\.":b?`), so both trace and diff URLs are matched by the
single `/trace/:id` route.

When the captured id contains "...", the URL
represents a diff comparison (e.g. /trace/abc...def); otherwise it is a
single-trace view.
*/
export default function TraceRouter() {
  const { id = '' } = useParams<{ id: string }>();
  if (id.includes('...')) {
    return <TraceDiff />;
  }

  return <TracePage />;
}
