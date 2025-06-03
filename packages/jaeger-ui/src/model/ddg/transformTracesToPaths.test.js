// Copyright (c) 2019 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import transformTracesToPaths from './transformTracesToPaths';

describe('transform traces to ddg paths', () => {
  const makeExpectedPath = (pathSpans, trace) => ({
    path: pathSpans.map(({ processID, operationName: operation }) => ({
      service: trace.data.processes[processID].serviceName,
      operation,
    })),
    attributes: [{ key: 'exemplar_trace_id', value: trace.data.traceID }],
  });

  const addExemplarTraceIDs = (path, traces) => {
    traces.forEach(trace => {
      path.attributes.push({ key: 'exemplar_trace_id', value: trace.data.traceID });
    });
    return path;
  };

  const makeSpan = (spanName, parent, kind, operationName, processID) => ({
    hasChildren: true,
    operationName: operationName || `${spanName} operation`,
    processID: processID || `${spanName} processID`,
    references: parent
      ? [
          {
            refType: 'CHILD_OF',
            span: parent,
            spanID: parent.spanID,
          },
        ]
      : [],
    tags:
      kind === false
        ? []
        : [
            {
              key: 'span.kind',
              value: kind === undefined ? 'server' : kind,
            },
          ],
    spanID: `${spanName} spanID`,
  });
  const makeTrace = (spans, traceID) => ({
    data: {
      processes: spans.reduce(
        (result, span) => ({
          ...result,
          [span.processID]: {
            serviceName: `${span.processID}-name`,
          },
        }),
        {}
      ),
      spans,
      traceID,
    },
  });
  const makeTraces = (...traces) =>
    traces.reduce((res, trace) => ({ ...res, [trace.data.traceID]: trace }), {});

  const branchingTraceID = 'branchingTraceID';
  const missTraceID = 'missTraceID';
  const rootSpan = makeSpan('root');
  const focalSpan = makeSpan('focal', rootSpan);
  const followsFocalSpan = makeSpan('followsFocal', focalSpan);
  followsFocalSpan.hasChildren = false;
  const notPathSpan = makeSpan('notPath', rootSpan);
  notPathSpan.hasChildren = false;

  const shortTrace = makeTrace([rootSpan, { ...focalSpan, hasChildren: false }], 'shortTraceID');
  const shortPath = makeExpectedPath([rootSpan, focalSpan], shortTrace);
  const longerTrace = makeTrace([rootSpan, focalSpan, followsFocalSpan], 'longerTraceID');
  const longerPath = makeExpectedPath([rootSpan, focalSpan, followsFocalSpan], longerTrace);
  const missTrace = makeTrace([rootSpan, notPathSpan], missTraceID);

  const focalSvc = shortTrace.data.processes[focalSpan.processID].serviceName;

  it('transforms single short trace result payload', () => {
    const { dependencies: result } = transformTracesToPaths(makeTraces(shortTrace), focalSvc);
    expect(result).toEqual([shortPath]);
  });

  it('transforms multiple traces result payload', () => {
    const { dependencies: result } = transformTracesToPaths(makeTraces(shortTrace, longerTrace), focalSvc);
    expect(new Set(result)).toEqual(new Set([shortPath, longerPath]));
  });

  it('ignores paths without focalService', () => {
    const branchingTrace = makeTrace([rootSpan, focalSpan, notPathSpan, followsFocalSpan], branchingTraceID);

    const { dependencies: result } = transformTracesToPaths(makeTraces(missTrace, branchingTrace), focalSvc);
    expect(result).toEqual([makeExpectedPath([rootSpan, focalSpan, followsFocalSpan], branchingTrace)]);
  });

  it('matches service and operation names', () => {
    const focalSpanWithDiffOp = {
      ...focalSpan,
      hasChildren: false,
      operationName: 'diff operation',
    };
    const diffOpTrace = makeTrace([rootSpan, focalSpanWithDiffOp], 'diffOpTraceID');
    const traces = makeTraces(diffOpTrace, longerTrace);

    const { dependencies: result } = transformTracesToPaths(traces, focalSvc);
    expect(new Set(result)).toEqual(
      new Set([makeExpectedPath([rootSpan, focalSpanWithDiffOp], diffOpTrace), longerPath])
    );

    const { dependencies: resultWithFocalOp } = transformTracesToPaths(
      traces,
      focalSvc,
      focalSpan.operationName
    );
    expect(resultWithFocalOp).toEqual([longerPath]);
  });

  it('transforms multiple paths from single trace', () => {
    const alsoFollowsFocalSpan = makeSpan('alsoFollows', focalSpan);
    alsoFollowsFocalSpan.hasChildren = false;
    const branchingTrace = makeTrace(
      [rootSpan, focalSpan, followsFocalSpan, alsoFollowsFocalSpan],
      branchingTraceID
    );

    const { dependencies: result } = transformTracesToPaths(makeTraces(branchingTrace), focalSvc);
    expect(new Set(result)).toEqual(
      new Set([
        makeExpectedPath([rootSpan, focalSpan, alsoFollowsFocalSpan], branchingTrace),
        makeExpectedPath([rootSpan, focalSpan, followsFocalSpan], branchingTrace),
      ])
    );
  });

  it('skips trace without data', () => {
    const traces = {
      ...makeTraces(shortTrace),
      noData: {},
    };

    const { dependencies: result } = transformTracesToPaths(traces, focalSvc);
    expect(result.length).toBe(1);
  });

  it("omits span if tags does not have span.kind === 'server' and is followed by the same service", () => {
    const spanServiceAServer = makeSpan('SpanA1', focalSpan, 'server', 'opA', 'serviceA');
    const otherSpanServiceAServer = makeSpan('SpanA2', spanServiceAServer, 'server', 'opB', 'serviceA');
    otherSpanServiceAServer.hasChildren = false;
    const spanServiceAClient = makeSpan('SpanA3', spanServiceAServer, 'client', 'opA', 'serviceA');
    spanServiceAClient.hasChildren = false;
    const spanServiceAKindless = makeSpan('SpanA4', spanServiceAServer, false, 'opA', 'serviceA');
    spanServiceAKindless.hasChildren = false;

    const spanServiceBClient = makeSpan('SpanB1', focalSpan, 'client', 'opA', 'serviceB');
    const spanServiceBServer = makeSpan('SpanB2', spanServiceBClient, 'server', 'opB', 'serviceB');
    spanServiceBServer.hasChildren = false;

    const serverClientTrace = makeTrace(
      [rootSpan, focalSpan, spanServiceAServer, spanServiceAClient],
      'serverClientTraceID'
    );
    const clientServerTrace = makeTrace(
      [rootSpan, focalSpan, spanServiceBClient, spanServiceBServer],
      'clientServerTraceID'
    );
    const kindlessTrace = makeTrace(
      [rootSpan, focalSpan, spanServiceAServer, spanServiceAKindless],
      'kindlessTraceID'
    );
    const twoServersTrace = makeTrace(
      [rootSpan, focalSpan, spanServiceAServer, otherSpanServiceAServer],
      'twoServersTraceID'
    );
    const { dependencies: result } = transformTracesToPaths(
      makeTraces(serverClientTrace, kindlessTrace, twoServersTrace, clientServerTrace),
      focalSvc
    );

    expect(new Set(result)).toEqual(
      new Set([
        addExemplarTraceIDs(makeExpectedPath([rootSpan, focalSpan, spanServiceAServer], serverClientTrace), [
          kindlessTrace,
        ]),
        makeExpectedPath([rootSpan, focalSpan, spanServiceAServer, otherSpanServiceAServer], twoServersTrace),
        makeExpectedPath([rootSpan, focalSpan, spanServiceBClient, spanServiceBServer], clientServerTrace),
      ])
    );
  });

  it('support client span root', () => {
    const spanServiceAClient = makeSpan('SpanA2', undefined, 'client', 'opA', 'serviceA');
    const spanServiceAServer = makeSpan('SpanA1', spanServiceAClient, 'server', 'opA', 'serviceA');
    const clientServerTrace = makeTrace([spanServiceAClient, spanServiceAServer], 'clientServerTraceID');
    spanServiceAServer.hasChildren = false;
    const { dependencies: result } = transformTracesToPaths(
      makeTraces(clientServerTrace),
      clientServerTrace.data.processes[spanServiceAClient.processID].serviceName
    );
    expect(new Set(result)).toEqual(
      new Set([makeExpectedPath([spanServiceAClient, spanServiceAServer], clientServerTrace)])
    );
  });

  it('dedupled paths', () => {
    const otherSpan = makeSpan('other-span', focalSpan);
    otherSpan.hasChildren = false;
    const trace1 = makeTrace([rootSpan, focalSpan, otherSpan], 'trace1');
    const trace2 = makeTrace([rootSpan, focalSpan, otherSpan], 'trace2');
    const { dependencies: result } = transformTracesToPaths(makeTraces(trace1, trace2), focalSvc);

    expect(new Set(result)).toEqual(
      new Set([addExemplarTraceIDs(makeExpectedPath([rootSpan, focalSpan, otherSpan], trace1), [trace2])])
    );
  });
});
