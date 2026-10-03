// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { TracesDataWire } from '../api/v3/schemas';
import type { ITraceSpec } from './trace-contract-spec';

/** Keep readable spec labels while assigning valid, stable wire IDs. */
export function spanIDForWire(label: string): string {
  if (/^(?!0+$)[0-9a-f]{16}$/i.test(label)) {
    return label.toLowerCase();
  }

  const fnvPrime = 0x100000001b3n;
  const uint64Mask = 0xffffffffffffffffn;
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(label)) {
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
              if (startTime !== undefined && (!Number.isSafeInteger(startTime) || startTime < 0)) {
                throw new Error(`Invalid OTLP startTime for span ${spanID}`);
              }
              if (duration !== undefined && (!Number.isSafeInteger(duration) || duration < 0)) {
                throw new Error(`Invalid OTLP duration for span ${spanID}`);
              }
              const refs = [
                ...(parentSpanID ? [{ refType: 'CHILD_OF' as const, spanID: parentSpanID }] : []),
                ...references,
              ];
              const parent = refs[0];
              // The first CHILD_OF is represented by parentSpanId. The v1 adapter keeps
              // FOLLOWS_FROM and any secondary references as links.
              const links = refs
                .filter((ref, index) => index > 0 || ref.refType === 'FOLLOWS_FROM')
                .map(ref => ({
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
              const start = BigInt(startTime ?? 0);
              const end = duration === undefined ? undefined : start + BigInt(duration);
              return {
                traceId: traceID,
                spanId: spanIDForWire(spanID),
                ...(parent ? { parentSpanId: spanIDForWire(parent.spanID) } : {}),
                name: operationName,
                ...(startTime === undefined || start === 0n
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
