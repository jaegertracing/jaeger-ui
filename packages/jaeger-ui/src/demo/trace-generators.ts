// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import Chance from 'chance';

type GeneratedSpan = {
  spanID: string;
  traceID: string;
  processID: string;
  operationName: string;
  startTime: number;
  duration: number;
  flags: number;
  tags: any[];
  logs: any[];
  references?: any[];
};

type GeneratedProcess = {
  processID: string;
  serviceName: string;
  tags: any[];
};

type GeneratedTrace = {
  traceID: string;
  spans: GeneratedSpan[];
  processes: Record<string, GeneratedProcess>;
};

type TraceOptions = {
  numberOfSpans?: number;
  numberOfProcesses?: number;
  maxDepth?: number;
  spansPerLevel?: number | null;
};

type SpanOptions = {
  traceID?: string;
  processes?: Record<string, GeneratedProcess>;
  traceStartTime?: number;
  traceEndTime?: number;
  operations?: string[];
};

type ProcessOptions = {
  services?: string[];
};

type TracesOptions = {
  numberOfTraces?: number;
};

type ProcessesOptions = {
  numberOfProcesses?: number;
};

const chance = new Chance();

export const SERVICE_LIST: string[] = [
  'serviceA',
  'serviceB',
  'serviceC',
  'serviceD',
  'serviceE',
  'serviceF',
];
export const OPERATIONS_LIST: string[] = [
  'GET',
  'PUT',
  'POST',
  'DELETE',
  'MySQL::SELECT',
  'MySQL::INSERT',
  'MongoDB::find',
  'MongoDB::update',
];

function setupParentSpan(spans: GeneratedSpan[], parentSpanValues: Partial<GeneratedSpan>): GeneratedSpan[] {
  Object.assign(spans[0], parentSpanValues);
  return spans;
}

function getParentSpanId(span: GeneratedSpan, levels: string[][]): string | null {
  let nestingLevel = chance.integer({ min: 1, max: levels.length });

  // pick the correct nesting level if allocated by the levels calculation
  levels.forEach((level, idx) => {
    if (level.indexOf(span.spanID) >= 0) {
      nestingLevel = idx;
    }
  });

  return nestingLevel - 1 >= 0 ? chance.pickone(levels[nestingLevel - 1]) : null;
}

/* this simulates the hierarchy created by CHILD_OF tags */
function attachReferences(
  spans: GeneratedSpan[],
  depth: number,
  spansPerLevel: number | null
): GeneratedSpan[] {
  if (spans.length === 0) {
    return spans;
  }
  let levels: string[][] = [[spans[0].spanID]];

  const duplicateLevelFilter =
    (currentLevels: string[][]) =>
    (span: GeneratedSpan): boolean =>
      !currentLevels.find(level => level.indexOf(span.spanID) >= 0);

  while (levels.length < depth) {
    const remainingSpans = spans.filter(duplicateLevelFilter(levels));
    if (remainingSpans.length <= 0) break;
    const newLevel = chance
      .pickset(remainingSpans, spansPerLevel || chance.integer({ min: 4, max: 8 }))
      .map((span: GeneratedSpan) => span.spanID);
    levels.push(newLevel);
  }

  // filter out empty levels
  levels = levels.filter(level => level.length > 0);

  return spans.map(span => {
    const parentSpanId = getParentSpanId(span, levels);
    return parentSpanId
      ? {
          ...span,
          references: [
            {
              refType: 'CHILD_OF',
              traceID: span.traceID,
              spanID: parentSpanId,
            },
          ],
        }
      : span;
  });
}

export default chance.mixin({
  // Generate a trace with orphan spans (spans referencing non-existent parents)
  // Useful for testing incomplete trace warnings
  traceWithOrphans({ numberOfSpans = 10, numberOfOrphans = 2, numberOfProcesses = 3 }) {
    const traceID = chance.guid();
    const duration = chance.integer({ min: 10000, max: 5000000 });
    const timestamp = (new Date().getTime() - chance.integer({ min: 0, max: 1000 }) * 1000) * 1000;

    const processArray = chance.processes({ numberOfProcesses });
    const processes = processArray.reduce(
      (pMap: Record<string, GeneratedProcess>, p: GeneratedProcess) => ({ ...pMap, [p.processID]: p }),
      {}
    );

    // Create normal spans first
    let spans = chance.n(chance.span, numberOfSpans - numberOfOrphans, {
      traceID,
      processes,
      traceStartTime: timestamp,
      traceEndTime: timestamp + duration,
    });

    // Setup root span
    if (spans.length > 0) {
      spans[0] = { ...spans[0], startTime: timestamp, duration, references: [] };
    }

    // Add references to existing spans for non-orphan spans
    spans = spans.map((span: GeneratedSpan, idx: number) => {
      if (idx === 0) return span; // root span has no parent
      return {
        ...span,
        references: [
          {
            refType: 'CHILD_OF',
            traceID,
            spanID: spans[0].spanID, // reference the root span
          },
        ],
      };
    });

    // Create orphan spans with references to non-existent parent spans
    for (let i = 0; i < numberOfOrphans; i++) {
      const orphanSpan = chance.span({
        traceID,
        processes,
        traceStartTime: timestamp,
        traceEndTime: timestamp + duration,
      });
      orphanSpan.references = [
        {
          refType: 'CHILD_OF',
          traceID,
          spanID: `non-existent-parent-${i}`, // This parent doesn't exist!
        },
      ];
      orphanSpan.operationName = `orphan-operation-${i}`;
      spans.push(orphanSpan);
    }

    return {
      traceID,
      spans,
      processes,
    };
  },
  trace({
    // long trace
    // very short trace
    // average case
    numberOfSpans = Math.max(
      1,
      chance.pickone([
        Math.ceil(chance.normal({ mean: 200, dev: 10 })) + 1,
        Math.ceil(chance.integer({ min: 3, max: 10 })),
        Math.ceil(chance.normal({ mean: 45, dev: 15 })) + 1,
      ])
    ),
    numberOfProcesses = chance.integer({ min: 1, max: 10 }),
    maxDepth = chance.integer({ min: 1, max: 10 }),
    spansPerLevel = null,
  }: TraceOptions = {}): GeneratedTrace {
    const traceID = chance.guid();
    const duration = chance.integer({ min: 10000, max: 5000000 });
    const timestamp = (new Date().getTime() - chance.integer({ min: 0, max: 1000 }) * 1000) * 1000;

    const processArray = chance.processes({ numberOfProcesses });
    const processes = processArray.reduce(
      (pMap: Record<string, GeneratedProcess>, p: GeneratedProcess) => ({ ...pMap, [p.processID]: p }),
      {}
    );

    let spans = chance.n(chance.span, numberOfSpans, {
      traceID,
      processes,
      traceStartTime: timestamp,
      traceEndTime: timestamp + duration,
    });
    spans = attachReferences(spans, maxDepth, spansPerLevel);
    if (spans.length > 1) {
      spans = setupParentSpan(spans, { startTime: timestamp, duration });
    }

    return {
      traceID,
      spans,
      processes,
    };
  },
  tag(): any {
    return {
      key: 'http.url',
      type: 'String',
      value: `/v2/${chance.pickone(['alpha', 'beta', 'gamma'])}/${chance.guid()}`,
    };
  },
  span({
    traceID = chance.guid(),
    processes = {},
    traceStartTime = chance.timestamp() * 1000 * 1000,
    traceEndTime = traceStartTime + 100000,
    operations = OPERATIONS_LIST,
  }: SpanOptions = {}): GeneratedSpan {
    const startTime = chance.integer({
      min: traceStartTime,
      max: traceEndTime - 1,
    });

    return {
      traceID,
      processID: chance.pickone(Object.keys(processes)),
      spanID: chance.guid(),
      flags: 0,
      operationName: chance.pickone(operations),
      references: [],
      startTime,
      duration: chance.integer({ min: 1, max: traceEndTime - startTime }),
      tags: chance.tags(),
      logs: [],
    };
  },
  process({ services = SERVICE_LIST }: ProcessOptions = {}): GeneratedProcess {
    return {
      processID: chance.guid(),
      serviceName: chance.pickone(services),
      tags: chance.tags(),
    };
  },
  traces({ numberOfTraces = chance.integer({ min: 5, max: 15 }) }: TracesOptions = {}): GeneratedTrace[] {
    return chance.n(chance.trace, numberOfTraces, {});
  },
  tags(): any[] {
    return chance.n(chance.tag, chance.integer({ min: 1, max: 10 }), {});
  },
  processes({
    numberOfProcesses = chance.integer({ min: 1, max: 25 }),
  }: ProcessesOptions = {}): GeneratedProcess[] {
    return chance.n(chance.process, numberOfProcesses, {});
  },
});
