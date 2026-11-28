// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import Chance from 'chance';

import { parseOtelTrace } from '../api/v3/parser';
import type { TracesDataWire } from '../api/v3/schemas';
import type { IOtelTrace } from '../types/otel';
import type { Microseconds } from '../types/units';

const chance = new Chance();
const HEX = '0123456789abcdef';

const SERVICE_LIST = ['serviceA', 'serviceB', 'serviceC', 'serviceD', 'serviceE', 'serviceF'];
const OPERATIONS_LIST = [
  'GET',
  'PUT',
  'POST',
  'DELETE',
  'MySQL::SELECT',
  'MySQL::INSERT',
  'MongoDB::find',
  'MongoDB::update',
];

interface IOtelTraceOptions {
  numberOfSpans?: number;
  numberOfProcesses?: number;
  maxDepth?: number;
}

interface IOtelTracesOptions {
  numberOfTraces?: number;
}

function randomHex(length: number): string {
  const value = chance.string({ length, pool: HEX });
  return /^0+$/.test(value) ? `${value.slice(0, -1)}1` : value;
}

function traceStartTime(): Microseconds {
  return ((Date.now() - chance.integer({ min: 0, max: 1000 }) * 1000) * 1000) as Microseconds;
}

function generatedServices(numberOfProcesses: number): string[] {
  return Array.from({ length: numberOfProcesses }, () => chance.pickone(SERVICE_LIST));
}

function generatedSpanAttributes() {
  return [
    {
      key: 'http.url',
      value: { stringValue: `/v2/${chance.pickone(['alpha', 'beta', 'gamma'])}/${chance.guid()}` },
    },
  ];
}

/** Generates OTLP wire data that is valid input for parseOtelTrace(). */
function wireTrace({
  numberOfSpans = Math.max(
    1,
    chance.pickone([
      Math.ceil(chance.normal({ mean: 200, dev: 10 })) + 1,
      chance.integer({ min: 3, max: 10 }),
      Math.ceil(chance.normal({ mean: 45, dev: 15 })) + 1,
    ])
  ),
  numberOfProcesses = chance.integer({ min: 1, max: 10 }),
  maxDepth = chance.integer({ min: 1, max: 10 }),
}: IOtelTraceOptions = {}): TracesDataWire {
  const traceId = randomHex(32);
  const services = generatedServices(numberOfProcesses);
  const startTime = traceStartTime();
  const traceDuration = chance.integer({ min: 10000, max: 5000000 });
  const spanIds = Array.from({ length: numberOfSpans }, () => randomHex(16));
  const depths: number[] = [];
  const spans = spanIds.map((spanId, index) => {
    const parentCandidates = Array.from({ length: index }, (_, candidate) => candidate).filter(
      candidate => depths[candidate] < maxDepth - 1
    );
    const parentIndex =
      index === 0 || parentCandidates.length === 0 ? undefined : chance.pickone(parentCandidates);
    const start = startTime + chance.integer({ min: 0, max: traceDuration - 1 });
    const duration = chance.integer({ min: 1, max: traceDuration - (start - startTime) });
    depths.push(parentIndex === undefined ? 0 : depths[parentIndex] + 1);

    return {
      traceId,
      spanId,
      ...(parentIndex === undefined ? {} : { parentSpanId: spanIds[parentIndex] }),
      name: chance.pickone(OPERATIONS_LIST),
      kind: 2,
      startTimeUnixNano: (BigInt(start) * 1000n).toString(),
      endTimeUnixNano: (BigInt(start + duration) * 1000n).toString(),
      attributes: generatedSpanAttributes(),
      status: {},
    };
  });

  return {
    resourceSpans: services.map((serviceName, index) => ({
      resource: {
        attributes: [{ key: 'service.name', value: { stringValue: serviceName } }],
      },
      scopeSpans: [
        {
          scope: { name: 'jaeger-ui-test-generator' },
          spans: spans.filter((_, spanIndex) => spanIndex % services.length === index),
        },
      ],
    })),
  };
}

function trace(options?: IOtelTraceOptions): IOtelTrace {
  const parsed = parseOtelTrace(wireTrace(options));
  if (!parsed) throw new Error('OTLP trace generator produced no spans');
  return parsed;
}

function traces({
  numberOfTraces = chance.integer({ min: 5, max: 15 }),
}: IOtelTracesOptions = {}): IOtelTrace[] {
  return Array.from({ length: numberOfTraces }, () => trace());
}

const otelTraceGenerator = { trace, traces, wireTrace };

export default otelTraceGenerator;
