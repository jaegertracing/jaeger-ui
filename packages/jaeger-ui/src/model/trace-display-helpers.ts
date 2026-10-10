// Copyright (c) 2020 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import _memoize from 'lodash/memoize';

import { Span } from '../types/trace';
import { getParentSpanID } from './span';

type TracePageHeaderParts = {
  serviceName: string;
  operationName: string;
};

export function _getTracePageHeaderPartsImpl(spans: ReadonlyArray<Span>): TracePageHeaderParts | null {
  // The header chooses the span with the earliest start time among those with no resolvable parent.
  let candidateSpan: Span | undefined;
  const allIDs: Set<string> = new Set(spans.map(({ spanID }) => spanID));

  for (let i = 0; i < spans.length; i++) {
    const parentSpanID = getParentSpanID(spans[i]);
    if (parentSpanID && allIDs.has(parentSpanID)) continue;

    if (!candidateSpan || spans[i].startTime < candidateSpan.startTime) {
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

const getTracePageHeaderParts = _memoize(_getTracePageHeaderPartsImpl, (spans: ReadonlyArray<Span>) => {
  if (!spans.length) return 0;
  return spans[0].traceID;
});

export function getTraceName(spans: ReadonlyArray<Span>): string {
  const parts = getTracePageHeaderParts(spans);

  return parts ? `${parts.serviceName}: ${parts.operationName}` : '';
}

export function getTracePageTitle(spans: ReadonlyArray<Span>): string {
  const parts = getTracePageHeaderParts(spans);

  return parts ? `${parts.operationName} (${parts.serviceName})` : '';
}

export function getIncompleteTraceTooltip(orphanCount: number): string {
  const noun = orphanCount !== 1 ? 'spans' : 'span';
  const verb = orphanCount !== 1 ? 'have' : 'has';
  return (
    `This trace may be incomplete: ${orphanCount} ${noun} ${verb} missing parent ${noun}. ` +
    `This can happen if the trace is still being collected when you view it. ` +
    `Try again later by opening or reloading the trace to see whether more spans are available.`
  );
}

export function getTraceEmoji(spans: ReadonlyArray<Pick<Span, 'traceID'>>): string {
  if (!spans.length) return '';

  // prettier-ignore
  const emojiSet = [
    '🐶', '🐱', '🐭', '🦊', '🐨', '🐮', '🐷', '🐸', '🐵', '🐔', '🐤', '🦆',
    '🦉', '🐝', '🦋', '🐢', '🦀', '🐳', '🐊', '🦒', '🪶', '🦩', '🐉', '🍄',
    '🌸', '🌜', '🔥', '🌪️', '💧', '🍏', '🍊', '🍉', '🍒', '🥦', '🌽', '🍠',
    '🥐', '🥖', '🥚', '🧀', '🍗', '🍟', '🍕', '🍣', '🍤', '🍙', '🍪', '⚽️',
    '🏀', '🥎', '🎹', '🎲', '🎮', '🧩', '🚗', '🚲', '🚂', '⛺️', '📞', '⏰',
    '🔌', '💎', '🪚', '🧲', '🧬', '🎀', '📬', '📘', '🩷', '🎵', '🏴', '🚩', 
  ];

  const traceID = spans[0].traceID;
  let index = 0;

  if (traceID) {
    for (let i = 0; i < traceID.length; i++) {
      const hexChar = traceID.slice(i, i + 1);
      index = (index * 16 + parseInt(hexChar, 16)) % emojiSet.length;
    }
  }

  return emojiSet[index];
}
