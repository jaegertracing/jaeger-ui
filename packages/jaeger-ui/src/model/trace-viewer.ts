// Copyright (c) 2020 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import _memoize from 'lodash/memoize';

import { Span } from '../types/trace';

type TracePageHeaderParts = {
  serviceName: string;
  operationName: string;
};

export function _getTracePageHeaderPartsImpl(spans: ReadonlyArray<Span>): TracePageHeaderParts | null {
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

export const getTracePageHeaderParts = _memoize(
  _getTracePageHeaderPartsImpl,
  (spans: ReadonlyArray<Span>) => {
    if (!spans.length) return 0;
    return spans[0].traceID;
  }
);

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

export function getTraceEmoji(spans: ReadonlyArray<Span>): string {
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
