// Copyright (c) 2023 The Jaeger Authors
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

import { Span } from '../../../../types/trace';

/**
 * This function finds the Last Finishing Child (LFC) span of a given current span
 *  Example:
 * |-------------spanA--------------|
 *    |--spanB--|    |--spanC--|
 * The LFC of spanA would be spanC, as it finishes last among its child spans.
 *
 * However, if a child span (like spanC) doesn't have any child spans of its own,
 * the focus shifts to the parent span (spanA). In this case, we check whether
 * there is an LFC of spanA that finishes before the startTime of spanC.
 * This 'startTime' is referred to as 'spawnTime' below.
 * @param spawnTime - The startTime of a subsequent span (like spanC) that triggers the
 *                   need to find the Last Finishing Child span of the current span.
 */
const findLastFinishingChildSpanId = (
  spanMap: Map<string, Span>,
  currentSpan: Span,
  spawnTime?: number
): string | undefined => {
  if (spawnTime) {
    return currentSpan.childSpanIds.find(
      each =>
        // Look up the span using the map
        spanMap.has(each) && spanMap.get(each)!.startTime + spanMap.get(each)!.duration < spawnTime
    );
  }
  return currentSpan.childSpanIds ? currentSpan.childSpanIds[0] : undefined;
};

export default findLastFinishingChildSpanId;
