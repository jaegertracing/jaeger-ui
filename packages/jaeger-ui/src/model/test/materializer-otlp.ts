// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { TracesDataWire } from '../../api/v3/schemas';
import type { ISpecAttribute, ITraceSpec } from './trace-contract-spec';

const spanKindWire = {
  unspecified: 0,
  internal: 1,
  server: 2,
  client: 3,
  producer: 4,
  consumer: 5,
} as const;

const statusCodeWire = { unset: 0, ok: 1, error: 2 } as const;

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

/** Render contract test span specs as OTLP TracesData for transformOtelTrace(). */
export function toOtlpTrace({ traceID, serviceName, resourceAttributes, spans }: ITraceSpec): TracesDataWire {
  const attributeValue = (value: string | number | boolean) => {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { boolValue: value };
    return Number.isSafeInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  };
  const wireAttributes = (attributes: ISpecAttribute[] = []) =>
    attributes.map(attribute => ({ key: attribute.key, value: attributeValue(attribute.value) }));

  // One resource per service, in order of first appearance.
  const spansByService = new Map<string, ITraceSpec['spans']>();
  for (const span of spans) {
    const spanServiceName = span.serviceName ?? serviceName;
    const serviceSpans = spansByService.get(spanServiceName);
    if (serviceSpans) serviceSpans.push(span);
    else spansByService.set(spanServiceName, [span]);
  }

  return {
    resourceSpans: [...spansByService].map(([spanServiceName, serviceSpans]) => ({
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: spanServiceName } },
          ...wireAttributes(resourceAttributes),
        ],
      },
      // Each span gets its own scopeSpans entry so that the wire keeps the spec's span order within each service.
      scopeSpans: serviceSpans.map(span => {
        const {
          spanID,
          name: operationName,
          kind,
          status,
          parentSpanID,
          links: specLinks = [],
          startTime,
          duration,
          attributes: tags = [],
          events = [],
          scope,
          warnings,
        } = {
          startTime: 1,
          duration: 1,
          ...span,
        };
        // A shared contract case uses NaN for an unusable start time. OTLP
        // represents that case by omitting the start timestamp.
        const wireStartTime = Number.isNaN(startTime) ? undefined : startTime;
        if (wireStartTime !== undefined && (!Number.isSafeInteger(wireStartTime) || wireStartTime < 0)) {
          throw new Error(`Invalid OTLP startTime for span ${spanID}`);
        }
        if (duration !== undefined && (!Number.isSafeInteger(duration) || duration < 0)) {
          throw new Error(`Invalid OTLP duration for span ${spanID}`);
        }
        const links = specLinks.map(link => ({
          traceId: link.traceID ?? traceID,
          spanId: spanIDForWire(link.spanID),
          attributes: wireAttributes(link.attributes),
        }));
        const start = BigInt(wireStartTime ?? 0);
        const end = duration === undefined ? undefined : start + BigInt(duration);
        const wireSpan = {
          traceId: traceID,
          spanId: spanIDForWire(spanID),
          ...(parentSpanID ? { parentSpanId: spanIDForWire(parentSpanID) } : {}),
          name: operationName,
          ...(kind === undefined ? {} : { kind: spanKindWire[kind] }),
          events: events.map(event => ({
            ...(event.name === undefined ? {} : { name: event.name }),
            timeUnixNano: (BigInt(event.timestamp) * 1000n).toString(),
            attributes: wireAttributes(event.attributes),
          })),
          ...(wireStartTime === undefined || start === 0n
            ? {}
            : { startTimeUnixNano: (start * 1000n).toString() }),
          ...(end === undefined || end === 0n ? {} : { endTimeUnixNano: (end * 1000n).toString() }),
          attributes: [
            ...wireAttributes(tags),
            // The v3 API sends backend diagnostics in this reserved attribute.
            ...(warnings === undefined
              ? []
              : [
                  {
                    key: '@jaeger@warnings',
                    value: { arrayValue: { values: warnings.map(warning => ({ stringValue: warning })) } },
                  },
                ]),
          ],
          links,
          // The v3 API sends an unset status as an empty object.
          status:
            status === undefined
              ? {}
              : {
                  code: statusCodeWire[status.code],
                  ...(status.message === undefined ? {} : { message: status.message }),
                },
        };
        return { ...(scope === undefined ? {} : { scope }), spans: [wireSpan] };
      }),
    })),
  };
}
