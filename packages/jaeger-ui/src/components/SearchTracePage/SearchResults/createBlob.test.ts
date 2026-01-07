// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { createBlob } from './index';
import transformTraceData from '../../../model/transform-trace-data';
import { TraceData, SpanData, SpanReference } from '../../../types/trace';

describe('createBlob regression test', () => {
  it('successfully serializes a trace with parent-child circular references to a schema-compliant JSON', async () => {
    // Define types for the serialized data which lacks circular references
    type SerializedSpanReference = Omit<SpanReference, 'span'>;
    type SerializedSpanData = Omit<SpanData, 'references'> & { references: SerializedSpanReference[] };
    type SerializedTraceData = TraceData & { spans: SerializedSpanData[] };

    // 1. Create a raw trace with a parent and a child
    const rawTrace: SerializedTraceData = {
      traceID: 'circular-trace-id',
      processes: {
        p1: { serviceName: 'service-1', tags: [] },
      },
      spans: [
        {
          traceID: 'circular-trace-id',
          spanID: 'parent-span',
          operationName: 'parent',
          processID: 'p1',
          startTime: 1,
          duration: 1000,
          tags: [],
          logs: [],
          warnings: [],
          references: [],
        },
        {
          traceID: 'circular-trace-id',
          spanID: 'child-span-1',
          operationName: 'child-1',
          processID: 'p1',
          startTime: 10,
          duration: 100,
          tags: [],
          logs: [],
          warnings: [],
          references: [
            {
              refType: 'CHILD_OF',
              traceID: 'circular-trace-id',
              spanID: 'parent-span',
            },
          ],
        },
        {
          traceID: 'circular-trace-id',
          spanID: 'child-span-2',
          operationName: 'child-2',
          processID: 'p1',
          startTime: 20,
          duration: 100,
          tags: [],
          logs: [],
          warnings: [],
          references: [
            {
              refType: 'CHILD_OF',
              traceID: 'circular-trace-id',
              spanID: 'parent-span',
            },
            {
              refType: 'FOLLOWS_FROM',
              traceID: 'circular-trace-id',
              spanID: 'child-span-1',
            },
          ],
        },
      ],
    };

    // 2. Transform it (this introduces circular references like childSpans, references[].span, and subsidiarilyReferencedBy)
    // We utilize JSON parse/stringify to simulate a fresh object structure similar to what we'd get from API,
    // ensuring we don't accidentally mutate our expected 'rawTrace' during transformation (though transform mutates inputs, we want rawTrace to stay clean for comparison).
    const inputTrace = JSON.parse(JSON.stringify(rawTrace));
    const transformedTrace = transformTraceData(inputTrace);
    expect(transformedTrace).not.toBeNull();

    // 3. Create the blob (this triggers JSON.stringify with getStripCircular)
    const blob = createBlob([transformedTrace]);

    // 4. Read the blob content back using FileReader (available in JSDOM)
    const jsonString = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

    // 5. Verify the output matches TraceData schema
    // Parse the full object {"data": [...]}
    const parsed: { data: SerializedTraceData[] } = JSON.parse(jsonString);
    const serializedTrace = parsed.data[0];

    // The expected output should NOT have derived fields like traceName,
    // duration (at trace level), etc. which are added by transformTraceData.
    expect(serializedTrace).toEqual(rawTrace);

    // Explicitly verify circular fields are gone
    expect(serializedTrace.spans[0]).not.toHaveProperty('childSpans');
    // @ts-ignore - access property not in type to verify it's missing at runtime
    expect(serializedTrace.spans[1]).not.toHaveProperty('subsidiarilyReferencedBy');
  });
});
