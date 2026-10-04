// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { TracesDataWire } from '../api/v3/schemas';
import type { ITraceSpec } from './trace-contract-spec';

/** Convert readable span IDs in test specs to stable, valid OTLP span IDs. */
export function spanIDForWire(spanID: string): string {
  if (/^(?!0+$)[0-9a-f]{16}$/i.test(spanID)) {
    return spanID.toLowerCase();
  }

  const fnvPrime = 0x100000001b3n;
  const uint64Mask = 0xffffffffffffffffn;
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(spanID)) {
    hash = ((hash ^ BigInt(byte)) * fnvPrime) & uint64Mask;
  }
  return (hash === 0n ? 1n : hash).toString(16).padStart(16, '0');
}

/** Render contract test span specs as OTLP TracesData for parseOtelTrace(). */
export function toOtlpTrace({ traceID, serviceName, spans }: ITraceSpec): TracesDataWire {
  const attributeValue = (value: string | number | boolean) => {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { boolValue: value };
    return Number.isSafeInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  };

  return {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: serviceName } }],
        },
        scopeSpans: [
          {
            scope: {},
            spans: spans.map(span => {
              const {
                spanID,
                operationName,
                parentSpanID,
                references = [],
                startTime,
                duration,
                tags = [],
              } = {
                startTime: 1,
                duration: 1,
                ...span,
              };
              // A shared contract case uses NaN for an unusable start time. OTLP
              // represents that case by omitting the start timestamp.
              const wireStartTime = Number.isNaN(startTime) ? undefined : startTime;
              if (
                wireStartTime !== undefined &&
                (!Number.isSafeInteger(wireStartTime) || wireStartTime < 0)
              ) {
                throw new Error(`Invalid OTLP startTime for span ${spanID}`);
              }
              if (duration !== undefined && (!Number.isSafeInteger(duration) || duration < 0)) {
                throw new Error(`Invalid OTLP duration for span ${spanID}`);
              }
              const links = references.map(ref => ({
                traceId: traceID,
                spanId: spanIDForWire(ref.spanID),
                attributes: [
                  {
                    key: 'opentracing.ref_type',
                    value: {
                      stringValue: ref.refType === 'FOLLOWS_FROM' ? 'follows_from' : 'child_of',
                    },
                  },
                ],
              }));
              const start = BigInt(wireStartTime ?? 0);
              const end = duration === undefined ? undefined : start + BigInt(duration);
              return {
                traceId: traceID,
                spanId: spanIDForWire(spanID),
                ...(parentSpanID ? { parentSpanId: spanIDForWire(parentSpanID) } : {}),
                name: operationName,
                ...(wireStartTime === undefined || start === 0n
                  ? {}
                  : { startTimeUnixNano: (start * 1000n).toString() }),
                ...(end === undefined || end === 0n ? {} : { endTimeUnixNano: (end * 1000n).toString() }),
                attributes: tags.map(tag => ({ key: tag.key, value: attributeValue(tag.value) })),
                links,
                status: {},
              };
            }),
          },
        ],
      },
    ],
  };
}
