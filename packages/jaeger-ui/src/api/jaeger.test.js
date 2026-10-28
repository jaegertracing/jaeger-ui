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

describe('fetchQualityMetrics', () => {
  it('GETs the specified service and lookback', () => {
    const hours = '108';
    const service = 'test-service';
    JaegerAPI.fetchQualityMetrics(service, hours);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/quality-metrics?${queryString.stringify({ service, hours })}`,
      defaultOptions
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

  // Asking for a trace ID that does not exist answers 200 with an empty `data`
  // array and an `errors` entry that has no `code`. Left as a success, the empty
  // body reaches the caller and fails there as an opaque internal error.
  it('fetchTrace() throws when a 200 carries errors and no data', async () => {
    const msg = 'trace not found';
    const body = {
      data: [],
      errors: [{ msg, traceID: 'trace-id' }],
      limit: 0,
      offset: 0,
      total: 0,
    };

    fetchMock.mockReturnValue(
      Promise.resolve({
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(body),
      })
    );
    const err = await JaegerAPI.fetchTrace('trace-id').catch(e => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(msg);
    expect(err.httpStatus).toBe(200);
    expect(err.httpBody).toMatch(msg);
  });

  it('fetchTrace() resolves a 200 that carries both data and errors', async () => {
    const body = { data: generatedTraces, errors: [{ msg: 'a partial failure' }] };

    fetchMock.mockReturnValue(
      Promise.resolve({
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(body),
      })
    );
    const resp = await JaegerAPI.fetchTrace('trace-id');
    expect(resp.data).toBe(generatedTraces);
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
  describe('{ msg } error data without a code', () => {
    it('returns the message rather than the stringified object', () => {
      const data = { msg: 'trace not found', traceID: 'abc' };
      expect(getMessageFromError(data, 200)).toBe(data.msg);
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
