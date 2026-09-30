// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import lodash from 'lodash';
import readJsonFile, { extractServerErrorMessage, formatConvertErrorMessage } from './readJsonFile';
import JaegerAPI from '../api/jaeger';

let OTLPTrace;
let jaegerTrace;
let OTLPTraceMulti;
let jaegerTraceMulti;

const fixturesDir = path.resolve(import.meta.dirname, 'fixtures');

beforeAll(() => {
  OTLPTrace = JSON.parse(fs.readFileSync(`${fixturesDir}/otlp2jaeger-in.json`, 'utf-8'));
  jaegerTrace = JSON.parse(fs.readFileSync(`${fixturesDir}/otlp2jaeger-out.json`, 'utf-8'));
  OTLPTraceMulti = JSON.parse(fs.readFileSync(`${fixturesDir}/otlp2jaeger-multi-in-combined.json`, 'utf-8'));
  jaegerTraceMulti = JSON.parse(fs.readFileSync(`${fixturesDir}/oltp2jaeger-multi-out.json`, 'utf-8'));
});

jest.spyOn(JaegerAPI, 'transformOTLP').mockImplementation(APICallRequest => {
  if (lodash.isEqual(APICallRequest, OTLPTrace)) {
    return Promise.resolve(jaegerTrace);
  }

  if (lodash.isEqual(APICallRequest, OTLPTraceMulti)) {
    return Promise.resolve(jaegerTraceMulti);
  }

  // This defines case where API call errors out even after detecting a `resourceSpan` in the request
  return Promise.reject(new Error('backend transform failed'));
});

describe('fileReader.readJsonFile', () => {
  it('rejects when given an invalid file', () => {
    const p = readJsonFile({ rando: true });
    return expect(p).rejects.toMatchObject(expect.any(Error));
  });

  it('does not throw when given an invalid file', () => {
    let threw = false;
    try {
      const p = readJsonFile({ rando: true });
      // prevent the unhandled rejection warning
      p.catch(() => {});
    } catch {
      threw = true;
    }
    return expect(threw).toBe(false);
  });

  it('loads JSON data, successfully', () => {
    const obj = { ok: true };
    const file = new File([JSON.stringify(obj)], 'foo.json');
    const p = readJsonFile({ file });
    return expect(p).resolves.toMatchObject(obj);
  });

  it('loads JSON data (OTLP), successfully', () => {
    const inObj = OTLPTrace;
    const outObj = jaegerTrace;
    const file = new File([JSON.stringify(inObj)], 'foo.json');
    const p = readJsonFile({ file });
    return expect(p).resolves.toMatchObject(outObj);
  });

  it('rejects an OTLP trace with a message that includes the backend error', () => {
    const inObj = JSON.parse(
      fs.readFileSync(path.resolve(fixturesDir, 'otlp2jaeger-in-error.json'), 'utf-8')
    );
    const file = new File([JSON.stringify(inObj)], 'foo.json');
    const p = readJsonFile({ file });
    return expect(p).rejects.toThrow(/Error converting traces to OTLP: backend transform failed/);
  });

  it('rejects an OTLP trace with structured backend error message from response.data.errors', () => {
    jest.spyOn(JaegerAPI, 'transformOTLP').mockImplementationOnce(() =>
      Promise.reject({
        response: {
          data: {
            errors: [{ code: 400, msg: 'cannot unmarshal OTLP : readUint32: unexpected character' }],
          },
        },
      })
    );
    const inObj = JSON.parse(
      fs.readFileSync(path.resolve(fixturesDir, 'otlp2jaeger-in-error.json'), 'utf-8')
    );
    const file = new File([JSON.stringify(inObj)], 'foo.json');
    const p = readJsonFile({ file });
    return expect(p).rejects.toThrow(
      /Error converting traces to OTLP: cannot unmarshal OTLP : readUint32: unexpected character/
    );
  });

  it('rejects an OTLP trace when transform resolves with backend errors', () => {
    jest.spyOn(JaegerAPI, 'transformOTLP').mockImplementationOnce(() =>
      Promise.resolve({
        data: null,
        errors: [{ code: 400, msg: 'cannot unmarshal OTLP : readUint32: unexpected character' }],
      })
    );
    const inObj = JSON.parse(
      fs.readFileSync(path.resolve(fixturesDir, 'otlp2jaeger-in-error.json'), 'utf-8')
    );
    const file = new File([JSON.stringify(inObj)], 'foo.json');
    const p = readJsonFile({ file });
    return expect(p).rejects.toThrow(
      /Error converting traces to OTLP: cannot unmarshal OTLP : readUint32: unexpected character/
    );
  });

  it('falls back safely to default error message if server message is absent or malformed', () => {
    jest
      .spyOn(JaegerAPI, 'transformOTLP')
      .mockImplementationOnce(() => Promise.reject({ response: { data: { errors: [] } } }));
    const inObj = JSON.parse(
      fs.readFileSync(path.resolve(fixturesDir, 'otlp2jaeger-in-error.json'), 'utf-8')
    );
    const file = new File([JSON.stringify(inObj)], 'foo.json');
    const p = readJsonFile({ file });
    return expect(p).rejects.toThrow('Error converting traces to OTLP');
  });

  it('rejects malformed JSON', () => {
    const file = new File(['not-json'], 'foo.json');
    const p = readJsonFile({ file });
    return expect(p).rejects.toMatchObject(expect.any(Error));
  });

  it('loads JSON-per-line data', () => {
    const expectedOutput = jaegerTraceMulti;
    const fileContent = fs.readFileSync(path.resolve(fixturesDir, 'otlp2jaeger-multi-in.json.txt'), 'utf-8');
    const file = new File([fileContent], 'multi.json', { type: 'application/json' });
    const p = readJsonFile({ file });
    return expect(p).resolves.toMatchObject(expectedOutput);
  });

  it('rejects multi-line JSON with a malformed line', () => {
    const fileContent = '{"a":1}\n{"b":';
    const file = new File([fileContent], 'multi-error.json', { type: 'application/json' });
    const p = readJsonFile({ file });
    return expect(p).rejects.toThrow(/Error parsing JSON at line 2:/);
  });

  describe('FileReader mocking', () => {
    let fileReaderSpy;

    afterEach(() => {
      fileReaderSpy.mockRestore();
    });

    it('handles FileReader error', () => {
      const file = new File([''], 'error.json');
      const mockReader = { readAsText: jest.fn(), onerror: null, error: new Error('Read error') };

      fileReaderSpy = jest.spyOn(window, 'FileReader').mockImplementation(function () {
        return mockReader;
      });
      const promise = readJsonFile({ file });

      mockReader.onerror();

      return expect(promise).rejects.toThrow(/Read error/);
    });

    it('handles FileReader abort', () => {
      const file = new File([''], 'abort.json');
      const mockReader = { readAsText: jest.fn(), onabort: null };

      fileReaderSpy = jest.spyOn(window, 'FileReader').mockImplementation(function () {
        return mockReader;
      });
      const promise = readJsonFile({ file });

      mockReader.onabort();

      return expect(promise).rejects.toThrow(/aborted/);
    });

    it('rejects if FileReader result is not a string', () => {
      const file = new File(['{ "test": true }'], 'dummy.json');
      const mockReader = { readAsText: jest.fn(), onload: null, result: {} };

      fileReaderSpy = jest.spyOn(window, 'FileReader').mockImplementation(function () {
        return mockReader;
      });
      const promise = readJsonFile({ file });

      mockReader.onload();

      return expect(promise).rejects.toThrow(/Invalid result type/);
    });
  });
});

describe('extractServerErrorMessage', () => {
  it('extracts msg from response.data.errors', () => {
    expect(
      extractServerErrorMessage({
        response: { data: { errors: [{ code: 400, msg: 'error from response.data' }] } },
      })
    ).toBe('error from response.data');
  });

  it('extracts msg from response.errors', () => {
    expect(
      extractServerErrorMessage({
        response: { errors: [{ code: 400, msg: 'error from response.errors' }] },
      })
    ).toBe('error from response.errors');
  });

  it('extracts msg from data.errors', () => {
    expect(
      extractServerErrorMessage({
        data: { errors: [{ code: 400, msg: 'error from data' }] },
      })
    ).toBe('error from data');
  });

  it('extracts msg from errors directly', () => {
    expect(
      extractServerErrorMessage({
        errors: [{ code: 400, msg: 'error from errors' }],
      })
    ).toBe('error from errors');
  });

  it('extracts msg from httpBody JSON string', () => {
    expect(
      extractServerErrorMessage({
        httpBody: JSON.stringify({ errors: [{ code: 400, msg: 'error from httpBody' }] }),
      })
    ).toBe('error from httpBody');
  });

  it('extracts msg from Error message stripping HTTP Error prefix', () => {
    expect(extractServerErrorMessage(new Error('HTTP Error: server failed'))).toBe('server failed');
  });

  it('returns null for absent or malformed errors', () => {
    expect(extractServerErrorMessage(null)).toBeNull();
    expect(extractServerErrorMessage(undefined)).toBeNull();
    expect(extractServerErrorMessage({})).toBeNull();
    expect(extractServerErrorMessage({ errors: [] })).toBeNull();
    expect(extractServerErrorMessage({ errors: [{ code: 400 }] })).toBeNull();
    expect(extractServerErrorMessage({ errors: [{ code: 400, msg: '   ' }] })).toBeNull();
    expect(extractServerErrorMessage(new Error(''))).toBeNull();
  });
});

describe('formatConvertErrorMessage', () => {
  it('formats message with default prefix when server message is present', () => {
    expect(formatConvertErrorMessage(new Error('backend failed'))).toBe(
      'Error converting traces to OTLP: backend failed'
    );
  });

  it('returns default message when server message is absent or malformed', () => {
    expect(formatConvertErrorMessage(null)).toBe('Error converting traces to OTLP');
    expect(formatConvertErrorMessage({})).toBe('Error converting traces to OTLP');
    expect(formatConvertErrorMessage({ errors: [] })).toBe('Error converting traces to OTLP');
  });

  it('does not duplicate default prefix if already present', () => {
    expect(formatConvertErrorMessage(new Error('Error converting traces to OTLP: backend failed'))).toBe(
      'Error converting traces to OTLP: backend failed'
    );
    expect(formatConvertErrorMessage(new Error('Error converting traces to OTLP'))).toBe(
      'Error converting traces to OTLP'
    );
  });
});
