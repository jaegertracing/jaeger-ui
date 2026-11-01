// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

const fetchMock = vi.fn(() =>
  Promise.resolve({
    status: 200,
    ok: true,
    data: () => Promise.resolve({ data: null }),
    json: () => Promise.resolve({ data: null }),
  })
);

vi.stubGlobal('fetch', fetchMock);

import queryString from 'query-string';

import traceGenerator from '../demo/trace-generators';
import JaegerAPI, { getMessageFromError, DEFAULT_API_ROOT } from './jaeger';
import { jaegerClient, DEFAULT_DEPENDENCY_LOOKBACK } from './v3/client';

const defaultOptions = {
  credentials: 'same-origin',
};

describe('fetchDeepDependencyGraph', () => {
  it('GETs the specified query', async () => {
    const query = { service: 'serviceName', start: 400, end: 800 };
    await jaegerClient.fetchDeepDependencyGraph(query);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${DEFAULT_API_ROOT}deep-dependencies?${queryString.stringify(query)}`,
      { signal: undefined }
    );
  });
});

describe('fetchDependencies', () => {
  it('GETs the specified query', async () => {
    const endTs = 12345;
    const lookback = 3600000;
    await jaegerClient.fetchDependencies(endTs, lookback);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${DEFAULT_API_ROOT}dependencies?${queryString.stringify({ endTs, lookback })}`,
      { signal: undefined }
    );
  });

  it('has default query values', async () => {
    await jaegerClient.fetchDependencies();
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringMatching(
        new RegExp(`${DEFAULT_API_ROOT}dependencies\\?endTs=\\d+&lookback=${DEFAULT_DEPENDENCY_LOOKBACK}`)
      ),
      { signal: undefined }
    );
  });
});

describe('fetchServiceServerOps', () => {
  it('GETs the specified query', () => {
    const service = 'serviceName';
    const query = { service, spanKind: 'server' };
    JaegerAPI.fetchServiceServerOps(service);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${DEFAULT_API_ROOT}operations?${queryString.stringify(query)}`,
      defaultOptions
    );
  });
});

describe('fetchServiceOperations', () => {
  it('GETs the specified service operations', () => {
    JaegerAPI.fetchServiceOperations('service/name');
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${DEFAULT_API_ROOT}services/service%2Fname/operations`,
      defaultOptions
    );
  });
});

describe('fetchTrace', () => {
  const generatedTraces = traceGenerator.traces({ numberOfTraces: 5 });

  it('fetchTrace() should fetch with the id', () => {
    JaegerAPI.fetchTrace('trace-id');
    expect(fetchMock).toHaveBeenLastCalledWith(`${DEFAULT_API_ROOT}traces/trace-id`, defaultOptions);
  });

  it('fetchTrace() should resolve the whole response', async () => {
    fetchMock.mockReturnValue(
      Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ data: generatedTraces }),
      })
    );

    const resp = await JaegerAPI.fetchTrace('trace-id');
    expect(resp.data).toBe(generatedTraces);
  });

  it('fetchTrace() throws an error on a >= 400 status code', async () => {
    const status = 400;
    const statusText = 'some-status';
    const msg = 'some-message';
    const errorData = { errors: [{ msg, code: status }] };

    fetchMock.mockReturnValue(
      Promise.resolve({
        status,
        statusText,
        text: () => Promise.resolve(JSON.stringify(errorData)),
      })
    );
    const err = await JaegerAPI.fetchTrace('trace-id').catch(e => e);
    expect(err.message).toMatch(msg);
    expect(err.httpStatus).toBe(status);
    expect(err.httpStatusText).toBe(statusText);
  });

  it('fetchTrace() throws an useful error derived from a text payload', async () => {
    const status = 400;
    const statusText = 'some-status';
    const errorData = 'this is some error message';

    fetchMock.mockReturnValue(
      Promise.resolve({
        status,
        statusText,
        text: () => Promise.resolve(errorData),
      })
    );
    const err = await JaegerAPI.fetchTrace('trace-id').catch(e => e);
    expect(err.message).toMatch(errorData);
    expect(err.httpStatus).toBe(status);
    expect(err.httpStatusText).toBe(statusText);
  });
});

describe('getMessageFromError()', () => {
  describe('{ code, msg } error data', () => {
    const data = { code: 1, msg: 'some-message' };

    it('ignores code if it is the same as `status` arg', () => {
      expect(getMessageFromError(data, 1)).toBe(data.msg);
    });

    it('returns`$code - $msg` when code is novel', () => {
      const rv = getMessageFromError(data, -1);
      expect(rv).toBe(`${data.code} - ${data.msg}`);
    });
  });
  describe('other data formats', () => {
    it('stringifies the value, when possible', () => {
      const data = ['abc'];
      expect(getMessageFromError(data)).toBe(JSON.stringify(data));
    });

    it('returns the string, otherwise', () => {
      const data = {};
      data.data = data;
      expect(getMessageFromError(data)).toBe(String(data));
    });
  });
});

describe('fetchMetrics', () => {
  it('GETs metrics query', () => {
    fetchMock.mockReset();
    const metricsType = 'latencies';
    const serviceName = 'serviceName';
    const query = {
      quantile: 95,
    };
    fetchMock.mockReturnValue(
      Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ name: 'service_latencies', type: 'GAUGE', metrics: [] }),
      })
    );

    jaegerClient.fetchMetrics(metricsType, serviceName, query);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${DEFAULT_API_ROOT}metrics/${metricsType}?service=${serviceName}&${queryString.stringify(query)}`,
      { signal: undefined }
    );
  });

  it('GETs metrics query with repeated filter params', async () => {
    fetchMock.mockReset();
    const metricsType = 'calls';
    const serviceName = 'serviceName';
    const query = {
      quantile: 95,
      filter: ['deployment.environment:prod', 'k8s.cluster:us-west-1'],
    };
    fetchMock.mockReturnValue(
      Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ name: 'service_call_rate', type: 'GAUGE', metrics: [] }),
      })
    );

    await jaegerClient.fetchMetrics(metricsType, serviceName, query);
    const url = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][0];
    // Each filter must be its own query-string entry so the Go backend's
    // r.URL.Query()[filterParam] returns both values.
    expect(url).toContain('filter=deployment.environment%3Aprod');
    expect(url).toContain('filter=k8s.cluster%3Aus-west-1');
  });

  it('fetchMetrics() should add quantile to response', async () => {
    const metricsType = 'latencies';
    const serviceName = 'serviceName';
    const query = {
      quantile: 95,
    };

    fetchMock.mockReturnValue(
      Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ name: 'service_latencies', type: 'GAUGE', metrics: [] }),
      })
    );

    const resp = await jaegerClient.fetchMetrics(metricsType, serviceName, query);
    expect(resp.quantile).toBe(query.quantile);
  });
});

describe('fetchMetricDimensions', () => {
  it('GETs /api/metrics/dimensions', () => {
    fetchMock.mockReset();
    fetchMock.mockReturnValue(
      Promise.resolve({
        status: 200,
        json: () => Promise.resolve([]),
      })
    );

    JaegerAPI.fetchMetricDimensions();
    expect(fetchMock).toHaveBeenLastCalledWith(`${DEFAULT_API_ROOT}metrics/dimensions`, defaultOptions);
  });
});
