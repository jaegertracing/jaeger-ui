// Copyright (c) 2020 The Jaeger Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import _memoize from 'lodash/memoize';

import { Span } from '../types/trace';

export type TracePageHeaderParts = {
  serviceName: string;
  operationName: string;
};

export function _getTracePageHeaderPartsImpl(spans: Span[]): TracePageHeaderParts | null {
  // Use a span with no references to another span in given array
  // prefering the span with the fewest references
  // using start time as a tie breaker
  let candidateSpan: Span | undefined;
  const allIDs: Set<string> = new Set(spans.map(({ spanID }) => spanID));

  for (let i = 0; i < spans.length; i++) {
    const hasInternalRef =
      spans[i].references &&
      spans[i].references.some(({ traceID, spanID }) => traceID === spans[i].traceID && allIDs.has(spanID));
    if (hasInternalRef) continue;

    if (!candidateSpan) {
      candidateSpan = spans[i];
      continue;
    }

    const thisRefLength = (spans[i].references && spans[i].references.length) || 0;
    const candidateRefLength = (candidateSpan.references && candidateSpan.references.length) || 0;

    if (
      thisRefLength < candidateRefLength ||
      (thisRefLength === candidateRefLength && spans[i].startTime < candidateSpan.startTime)
    ) {
      candidateSpan = spans[i];
    }
  }

  if (!candidateSpan) {
    return null;
  }

  return {
    serviceName: candidateSpan.process.serviceName,
    operationName: candidateSpan.operationName,
  };
}

export const getTracePageHeaderParts = _memoize(_getTracePageHeaderPartsImpl, (spans: Span[]) => {
  if (!spans.length) return 0;
  return spans[0].traceID;
});

export function getTraceName(spans: Span[]): string {
  const parts = getTracePageHeaderParts(spans);

  return parts ? `${parts.serviceName}: ${parts.operationName}` : '';
}
