// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import traceGenerator from '../demo/trace-generators';
import JaegerAPI from './jaeger';

const generatedTraces = traceGenerator.traces({ traces: 5 });
jest.mock('isomorphic-fetch', () =>
  jest.fn(() =>
    Promise.resolve({
      status: 200,
      data: () => Promise.resolve({ data: null }),
      json: () => Promise.resolve({ data: null }),
    })
  )
);

const fetchMock = require('isomorphic-fetch');

it('fetchTrace() should fetch with the id', () => {
  fetchMock.mockClear();
  JaegerAPI.apiRoot = '/api/';
  JaegerAPI.fetchTrace('trace-id');
  expect(fetchMock.mock.calls[0][0]).toBe('/api/traces/trace-id');
});

it('fetchTrace() should resolve the whole response', () => {
  fetchMock.mockReturnValue(
    Promise.resolve({
      status: 200,
      json: () => Promise.resolve({ data: generatedTraces }),
    })
  );

  return JaegerAPI.fetchTrace('trace-id').then(resp => expect(resp.data).toBe(generatedTraces));
});

it('fetchTrace() should reject with a bad status code', () => {
  fetchMock.mockReturnValue(
    Promise.resolve({
      status: 400,
      json: () => Promise.resolve({ data: null }),
    })
  );

  JaegerAPI.fetchTrace('trace-id').then(
    () => new Error(),
    err => {
      expect(err instanceof Error).toBeTruthy();
    }
  );
});
