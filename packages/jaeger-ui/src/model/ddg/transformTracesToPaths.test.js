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
  const makeSpan = (spanName, parent, kind) => ({
    hasChildren: true,
    operationName: `${spanName} operation`,
    processID: `${spanName} processID`,
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
            serviceName: `${span.spanID.split(' ')[0]} service`,
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

  it('errors if span has ancestor id not in trace data', () => {
    const traces = makeTraces(makeTrace([rootSpan, followsFocalSpan], missTraceID));
    expect(() => transformTracesToPaths(traces, focalSvc)).toThrowError(/Ancestor spanID.*not found/);
  });

  it('skips trace without data', () => {
    const traces = {
      ...makeTraces(shortTrace),
      noData: {},
    };

    const { dependencies: result } = transformTracesToPaths(traces, focalSvc);
    expect(result.length).toBe(1);
  });

  it("omits span if tags does not have span.kind === 'server'", () => {
    const badSpanName = 'test bad span name';

    const clientSpan = makeSpan(badSpanName, focalSpan, 'client');
    clientSpan.hasChildren = false;
    const clientTrace = makeTrace([rootSpan, focalSpan, clientSpan], 'clientTraceID');

    const kindlessSpan = makeSpan(badSpanName, focalSpan, false);
    kindlessSpan.hasChildren = false;
    const kindlessTrace = makeTrace([rootSpan, focalSpan, kindlessSpan], 'kindlessTraceID');

    const { dependencies: result } = transformTracesToPaths(makeTraces(clientTrace, kindlessTrace), focalSvc);
    expect(new Set(result)).toEqual(
      new Set([
        makeExpectedPath([rootSpan, focalSpan], clientTrace),
        makeExpectedPath([rootSpan, focalSpan], kindlessTrace),
      ])
    );
  });
});
