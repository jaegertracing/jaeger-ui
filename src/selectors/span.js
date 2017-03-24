// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import { createSelector } from 'reselect';
import fuzzy from 'fuzzy';

import { getProcessServiceName } from './process';

export const getSpanId = span => span.spanID;
export const getSpanName = span => span.operationName;
export const getSpanDuration = span => span.duration;
export const getSpanTimestamp = span => span.startTime;
export const getSpanProcessId = span => span.processID;
export const getSpanReferences = span => span.references || [];
export const getSpanReferenceByType = createSelector(
  createSelector(({ span }) => span, getSpanReferences),
  ({ type }) => type,
  (references, type) => references.find(ref => ref.refType === type)
);
export const getSpanParentId = createSelector(
  span => getSpanReferenceByType({ span, type: 'CHILD_OF' }),
  childOfRef => childOfRef ? childOfRef.spanID : null
);

export const getSpanProcess = span => {
  if (!span.process) {
    throw new Error(
      `
      you must hydrate the spans with the processes, perhaps
      using hydrateSpansWithProcesses(), before accessing a span's process
    `
    );
  }

  return span.process;
};

export const getSpanServiceName = createSelector(
  getSpanProcess,
  getProcessServiceName
);

export const filterSpansForTimestamps = createSelector(
  ({ spans }) => spans,
  ({ leftBound }) => leftBound,
  ({ rightBound }) => rightBound,
  (spans, leftBound, rightBound) =>
    spans.filter(
      span =>
        getSpanTimestamp(span) >= leftBound &&
        getSpanTimestamp(span) <= rightBound
    )
);

export const filterSpansForText = createSelector(
  ({ spans }) => spans,
  ({ text }) => text,
  (spans, text) =>
    fuzzy
      .filter(text, spans, {
        extract: span => `${getSpanServiceName(span)} ${getSpanName(span)}`,
      })
      .map(({ original }) => original)
);

const getTextFilterdSpansAsMap = createSelector(
  filterSpansForText,
  matchingSpans =>
    matchingSpans.reduce(
      (obj, span) => ({
        ...obj,
        [getSpanId(span)]: span,
      }),
      {}
    )
);

export const highlightSpansForTextFilter = createSelector(
  ({ spans }) => spans,
  getTextFilterdSpansAsMap,
  (spans, textFilteredSpansMap) =>
    spans.map(span => ({
      ...span,
      muted: !textFilteredSpansMap[getSpanId(span)],
    }))
);
