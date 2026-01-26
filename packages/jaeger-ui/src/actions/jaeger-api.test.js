// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock(
  'node-fetch',
  () => () =>
    Promise.resolve({
      status: 200,
      data: () => Promise.resolve({ data: null }),
      json: () => Promise.resolve({ data: null }),
    })
);

function isPromise(p) {
  return p !== null && typeof p === 'object' && typeof p.then === 'function' && typeof p.catch === 'function';
}

import * as jaegerApiActions from './jaeger-api';
import JaegerAPI from '../api/jaeger';

// Mock the JaegerAPI module
jest.mock('../api/jaeger', () => ({
  fetchTrace: jest.fn(() => Promise.resolve()),
  searchTraces: jest.fn(() => Promise.resolve()),
  archiveTrace: jest.fn(() => Promise.resolve()),
  fetchServices: jest.fn(() => Promise.resolve()),
  fetchServiceOperations: jest.fn(() => Promise.resolve()),
  fetchServiceServerOps: jest.fn(() => Promise.resolve()),
  fetchDeepDependencyGraph: jest.fn(() => Promise.resolve()),
  fetchDependencies: jest.fn(() => Promise.resolve()),
  fetchMetrics: jest.fn(() => Promise.resolve()),
}));

describe('actions/jaeger-api', () => {
  const query = { param: 'value' };
  const id = 'my-trace-id';
  const ids = [id, id];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('@JAEGER_API/FETCH_TRACE should fetch the trace by id', () => {
    jaegerApiActions.fetchTrace(id);
    expect(JaegerAPI.fetchTrace).toHaveBeenCalledWith(id);
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
    jaegerApiActions.fetchMultipleTraces(ids);
    expect(JaegerAPI.searchTraces).toHaveBeenCalledWith(expect.objectContaining({ traceID: ids }));
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
    jaegerApiActions.archiveTrace(id);
    expect(JaegerAPI.archiveTrace).toHaveBeenCalledWith(id);
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
    jaegerApiActions.searchTraces(query);
    expect(JaegerAPI.searchTraces).toHaveBeenCalledWith(query);
  });

  it('@JAEGER_API/SEARCH_TRACES should return the promise', () => {
    const { payload } = jaegerApiActions.searchTraces(query);
    expect(isPromise(payload)).toBeTruthy();
  });

  it('@JAEGER_API/SEARCH_TRACES should attach the query as meta', () => {
    const { meta } = jaegerApiActions.searchTraces(query);
    expect(meta.query).toEqual(query);
  });

  it('@JAEGER_API/FETCH_DEEP_DEPENDENCY_GRAPH should fetch the graph by params', () => {
    jaegerApiActions.fetchDeepDependencyGraph(query);
    expect(JaegerAPI.fetchDeepDependencyGraph).toHaveBeenCalledWith(query);
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
    jaegerApiActions.fetchDependencies();
    expect(JaegerAPI.fetchDependencies).toHaveBeenCalledTimes(1);
  });

  it('@JAEGER_API/FETCH_ALL_SERVICE_METRICS should return the promise', () => {
    const { payload } = jaegerApiActions.fetchAllServiceMetrics('serviceName', query);
    expect(isPromise(payload)).toBeTruthy();
  });

  it('@JAEGER_API/FETCH_ALL_SERVICE_METRICS should fetch service metrics by name', () => {
    jaegerApiActions.fetchAllServiceMetrics('serviceName', query);
    expect(JaegerAPI.fetchMetrics).toHaveBeenCalledTimes(5);
  });

  it('@JAEGER_API/FETCH_AGGREGATED_SERVICE_METRICS should return the promise', () => {
    const { payload } = jaegerApiActions.fetchAggregatedServiceMetrics('serviceName', query);
    expect(isPromise(payload)).toBeTruthy();
  });

  it('@JAEGER_API/FETCH_AGGREGATED_SERVICE_METRICS should fetch service metrics by name', () => {
    jaegerApiActions.fetchAggregatedServiceMetrics('serviceName', query);
    expect(JaegerAPI.fetchMetrics).toHaveBeenCalledTimes(3);
  });
});
