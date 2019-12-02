// Copyright (c) 2017 Uber Technologies, Inc.
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

/* eslint-disable import/first */
jest.mock('node-fetch', () => () =>
  Promise.resolve({
    status: 200,
    data: () => Promise.resolve({ data: null }),
    json: () => Promise.resolve({ data: null }),
  })
);

import sinon from 'sinon';
import isPromise from 'is-promise';

import * as jaegerApiActions from './jaeger-api';
import JaegerAPI from '../api/jaeger';

describe('actions/jaeger-api', () => {
  const query = { param: 'value' };
  const id = 'my-trace-id';
  const ids = [id, id];
  let mock;

  beforeEach(() => {
    mock = sinon.mock(JaegerAPI);
  });

  afterEach(() => {
    mock.restore();
  });

  it('@JAEGER_API/FETCH_TRACE should fetch the trace by id', () => {
    mock.expects('fetchTrace').withExactArgs(id);
    jaegerApiActions.fetchTrace(id);
    expect(() => mock.verify()).not.toThrow();
  });

  it('@JAEGER_API/FETCH_TRACE should return the promise', () => {
    const { payload } = jaegerApiActions.fetchTrace(id);
    expect(isPromise(payload)).toBeTruthy();
  });

  it('@JAEGER_API/FETCH_TRACE should attach the id as meta', () => {
    const { meta } = jaegerApiActions.fetchTrace(id);
    expect(meta.id).toBe(id);
  });

  it('@JAEGER_API/FETCH_MULTIPLE_TRACES should fetch traces by ids', () => {
    mock.expects('searchTraces').withExactArgs(sinon.match.has('traceID', ids));
    jaegerApiActions.fetchMultipleTraces(ids);
    expect(() => mock.verify()).not.toThrow();
  });

  it('@JAEGER_API/FETCH_MULTIPLE_TRACES should return the promise', () => {
    const { payload } = jaegerApiActions.fetchMultipleTraces(ids);
    expect(isPromise(payload)).toBeTruthy();
  });

  it('@JAEGER_API/FETCH_MULTIPLE_TRACES should attach the ids as meta', () => {
    const { meta } = jaegerApiActions.fetchMultipleTraces(ids);
    expect(meta.ids).toBe(ids);
  });

  it('@JAEGER_API/ARCHIVE_TRACE should archive the trace by id', () => {
    mock.expects('archiveTrace').withExactArgs(id);
    jaegerApiActions.archiveTrace(id);
    expect(() => mock.verify()).not.toThrow();
  });

  it('@JAEGER_API/ARCHIVE_TRACE should return the promise', () => {
    const { payload } = jaegerApiActions.archiveTrace(id);
    expect(isPromise(payload)).toBeTruthy();
  });

  it('@JAEGER_API/ARCHIVE_TRACE should attach the id as meta', () => {
    const { meta } = jaegerApiActions.archiveTrace(id);
    expect(meta.id).toBe(id);
  });

  it('@JAEGER_API/SEARCH_TRACES should fetch the trace by id', () => {
    mock.expects('searchTraces').withExactArgs(query);
    jaegerApiActions.searchTraces(query);
    expect(() => mock.verify()).not.toThrow();
  });

  it('@JAEGER_API/SEARCH_TRACES should return the promise', () => {
    const { payload } = jaegerApiActions.searchTraces(query);
    expect(isPromise(payload)).toBeTruthy();
  });

  it('@JAEGER_API/SEARCH_TRACES should attach the query as meta', () => {
    const { meta } = jaegerApiActions.searchTraces(query);
    expect(meta.query).toEqual(query);
  });

  it('@JAEGER_API/FETCH_SERVICES should return a promise', () => {
    const { payload } = jaegerApiActions.fetchServices();
    expect(isPromise(payload)).toBeTruthy();
  });

  it('@JAEGER_API/FETCH_SERVICE_OPERATIONS should call the JaegerAPI', () => {
    const called = mock
      .expects('fetchServiceOperations')
      .once()
      .withExactArgs('service');
    jaegerApiActions.fetchServiceOperations('service');
    expect(called.verify()).toBeTruthy();
  });

  // Temporary mock used until backend is available, TODO revert & re-enable test
  xit('@JAEGER_API/FETCH_DEEP_DEPENDENCY_GRAPH should fetch the graph by params', () => {
    mock.expects('fetchDeepDependencyGraph').withExactArgs(query);
    jaegerApiActions.fetchDeepDependencyGraph(query);
    expect(() => mock.verify()).not.toThrow();
  });

  it('@JAEGER_API/FETCH_DEEP_DEPENDENCY_GRAPH should return the promise', () => {
    const { payload } = jaegerApiActions.fetchDeepDependencyGraph(query);
    expect(isPromise(payload)).toBeTruthy();
  });

  it('@JAEGER_API/FETCH_DEEP_DEPENDENCY_GRAPH should attach the query as meta', () => {
    const { meta } = jaegerApiActions.fetchDeepDependencyGraph(query);
    expect(meta.query).toEqual(query);
  });

  it('@JAEGER_API/FETCH_DEPENDENCIES should call the JaegerAPI', () => {
    const called = mock.expects('fetchDependencies').once();
    jaegerApiActions.fetchDependencies();
    expect(called.verify()).toBeTruthy();
  });
});

describe('mergeAll()', () => {
  const trace1 = {
    traceID: 'trace1',
    spans: [
      {
        traceID: 'trace1',
        spanID: 'span-1',
        processID: 'p1',
      },
    ],
    processes: {
      p1: {
        serviceName: 'frontend',
      },
    },
    warnings: ['warning 1'],
  };
  const trace2 = {
    traceID: 'trace2',
    spans: [
      {
        traceID: 'trace2',
        spanID: 'span-a',
        processID: 'p1',
      },
      {
        traceID: 'trace2',
        spanID: 'span-b',
        processID: 'p2',
      },
    ],
    processes: {
      p1: {
        serviceName: 'database',
      },
      p2: {
        serviceName: 'frontend',
      },
    },
    warnings: ['warning 2'],
  };
  it('mergeAll() of less than two traces returns identity', () => {
    const merge = jaegerApiActions.mergeAll('id');
    const traces = { data: [trace1] };
    expect(merge(traces)).toEqual(traces);
  });
  it('mergeAll() of many traces returns merged trace', () => {
    const merge = jaegerApiActions.mergeAll('id');
    const traces = { data: [trace1, trace2] };
    expect(merge(traces)).toEqual({
      data: [
        {
          processes: {
            p1: {
              serviceName: 'frontend',
            },
            p2: {
              serviceName: 'database',
            },
          },
          spans: [
            {
              processID: 'p1',
              spanID: 'span-1',
              traceID: 'trace1',
            },
            {
              processID: 'p2',
              spanID: 'span-a',
              traceID: 'trace2',
            },
            {
              processID: 'p1',
              spanID: 'span-b',
              traceID: 'trace2',
            },
          ],
          traceID: 'id',
          warnings: ['warning 1', 'warning 2'],
        },
      ],
    });
  });
});
