// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import readJsonFile from './readJsonFile';

let OTLPTrace;
let OTLPTraceMulti;

const fixturesDir = path.resolve(import.meta.dirname, 'fixtures');

beforeAll(() => {
  OTLPTrace = JSON.parse(fs.readFileSync(`${fixturesDir}/otlp2jaeger-in.json`, 'utf-8'));
  OTLPTraceMulti = JSON.parse(fs.readFileSync(`${fixturesDir}/otlp2jaeger-multi-in-combined.json`, 'utf-8'));
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
    const outObj = OTLPTrace;
    const file = new File([JSON.stringify(inObj)], 'foo.json');
    const p = readJsonFile({ file });
    return expect(p).resolves.toMatchObject(outObj);
  });

  it('rejects malformed JSON', () => {
    const file = new File(['not-json'], 'foo.json');
    const p = readJsonFile({ file });
    return expect(p).rejects.toMatchObject(expect.any(Error));
  });

  it.each(['null', 'true', '42', '"trace"'])('rejects valid JSON primitive %s', content => {
    const file = new File([content], 'foo.json');
    const p = readJsonFile({ file });
    return expect(p).rejects.toThrow('Invalid JSON trace format');
  });

  it.each(['', ' \n\t '])('rejects an empty or whitespace-only file', content => {
    const file = new File([content], 'empty.json');
    const p = readJsonFile({ file });
    return expect(p).rejects.toThrow('The JSON file is empty');
  });

  it('loads JSON-per-line data', () => {
    const fileContent = fs.readFileSync(path.resolve(fixturesDir, 'otlp2jaeger-multi-in.json.txt'), 'utf-8');
    const expectedOutput = fileContent
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));
    expect(expectedOutput.flatMap(document => document.resourceSpans)).toEqual(OTLPTraceMulti.resourceSpans);
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
