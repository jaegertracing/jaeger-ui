// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { TracesDataWire } from '../api/v3/schemas';
import type { ITraceSpec } from './trace-contract-spec';

const SPAN_ID_HEX = /^(?!0+$)[0-9a-f]{16}$/i;
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;

/** Keep readable spec labels while assigning valid, stable wire IDs. */
export function spanIDForWire(label: string): string {
  if (SPAN_ID_HEX.test(label)) {
    return label.toLowerCase();
  }

  let hash = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(label)) {
    hash = ((hash ^ BigInt(byte)) * FNV_PRIME) & UINT64_MASK;
  }
  return (hash === 0n ? 1n : hash).toString(16).padStart(16, '0');
}

/** Render the same span specs as OTLP JSON for the parser pipeline. */
export function toOtlpTrace({ traceID, serviceName, spans }: ITraceSpec): TracesDataWire {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: serviceName } }],
        },
        scopeSpans: [
          {
            scope: {},
            spans: spans.map(
              ({ spanID, operationName, parentSpanID, references = [], startTime, duration }) => {
                if (startTime !== undefined && (!Number.isSafeInteger(startTime) || startTime < 0)) {
                  throw new Error(`Invalid OTLP startTime for span ${spanID}`);
                }
                if (!Number.isSafeInteger(duration) || duration < 0) {
                  throw new Error(`Invalid OTLP duration for span ${spanID}`);
                }
                const refs = [
                  ...(parentSpanID ? [{ refType: 'CHILD_OF' as const, spanID: parentSpanID }] : []),
                  ...references,
                ];
                const parent = refs[0];
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
                const end = start + BigInt(duration);
                return {
                  traceId: traceID,
                  spanId: spanIDForWire(spanID),
                  ...(parent ? { parentSpanId: spanIDForWire(parent.spanID) } : {}),
                  name: operationName,
                  ...(start === 0n ? {} : { startTimeUnixNano: (start * 1000n).toString() }),
                  ...(end === 0n ? {} : { endTimeUnixNano: (end * 1000n).toString() }),
                  ...(links.length > 0 ? { links } : {}),
                  status: {},
                };
              }
            ),
          },
        ],
      },
    ],
  };
}
