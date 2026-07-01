// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useParams } from 'react-router-dom';
import TraceDiff from '../TraceDiff';
import TracePage from '../TracePage';
import { isDiffUrl } from '../TraceDiff/url';

/*
React Router v6 cannot correctly match the old TraceDiff path (/trace/:a?\.\.\.":b?), so we don’t use that route anymore.
Instead, both “single trace” and “compare two traces” URLs are matched by one route: /trace/:id.
When the user is comparing, the id looks like abc...def.
*/
export default function TraceRouter() {
  const { id = '' } = useParams<{ id: string }>();
  if (isDiffUrl(id)) {
    return <TraceDiff />;
  }

  return <TracePage />;
}
