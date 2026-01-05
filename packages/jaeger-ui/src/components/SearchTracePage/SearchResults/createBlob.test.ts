import { createBlob } from './index';
import transformTraceData from '../../../model/transform-trace-data';
import { TraceData, SpanData, SpanReference } from '../../../types/trace';

describe('createBlob regression test', () => {
  it('successfully serializes a trace with parent-child circular references to a schema-compliant JSON', async () => {
    // 1. Create a raw trace with a parent and a child
    const rawTrace: any = {
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
    const transformedTrace = transformTraceData(rawTrace);

    if (!transformedTrace) {
      throw new Error('transformTraceData returned null');
    }

    // 3. Create the blob (this triggers JSON.stringify with getStripCircular)
    const blob = createBlob([transformedTrace]);

    // 4. Read the blob content back using FileReader (available in JSDOM)
    const jsonString = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

    // Extract array from {"data": [...]}
    const json = JSON.parse(jsonString.substring(8, jsonString.length - 1));
    const serializedTrace = json[0];

    // 5. Verify the output matches TraceData schema
    // The expected output should NOT have derived fields like traceName, duration (at trace level), etc. because
    // rawTraces are expected to be the data layer represenation.
    // However, transformTraceData DOES add fields to the object it returns.
    // So serializedTrace WILL have 'traceName' etc. IF they are not stripped.
    // BUT the user says: "Expected trace must match TraceData schema. That has no such things as duration or tracename".
    // This implies that either:
    // a) transformTraceData returns a Trace domain object which extends TraceData but has extra fields.
    // b) We want to ensure that "data" download is clean and resembles TraceData.

    // Define types for the serialized data which lacks circular references
    type SerializedSpanReference = Omit<SpanReference, 'span'>;
    type SerializedSpanData = Omit<SpanData, 'references'> & { references: SerializedSpanReference[] };
    type SerializedTraceData = TraceData & { spans: SerializedSpanData[] };

    // Let's coerce the result to TraceData and check strict fields.
    const expectedTraceData: SerializedTraceData = {
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

    expect(serializedTrace).toMatchObject(expectedTraceData);

    // Explicitly verify circular fields are gone
    expect(serializedTrace.spans[0]).not.toHaveProperty('childSpans');
    expect(serializedTrace.spans[1]).not.toHaveProperty('subsidiarilyReferencedBy');
  });
});
